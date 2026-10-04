import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { preserveDroppedLogos } from "./catalog-snapshot";

const CATALOG_PATH = "data/catalog.json";
const CACHE_MS = 10_000;

export type CatalogLoad =
  | { ok: true; json: string | null }
  | { ok: false; reason: string };

type CacheEntry = { json: string | null; at: number };

let cache: CacheEntry | null = null;

export function resetDurableCatalogForTests() {
  cache = null;
}

export function catalogSecret() {
  const dedicated = process.env.CATALOG_SECRET?.trim();
  if (dedicated) return dedicated;
  const admin = process.env.ADMIN_PASSWORD?.trim();
  if (admin) return admin;
  if (process.env.VERCEL === "1") return "";
  return "123Cbiux@#$";
}

export function catalogBackupStatus() {
  const token = Boolean(process.env.CATALOG_GITHUB_TOKEN?.trim());
  const onVercel = process.env.VERCEL === "1";
  return {
    durable: token || !onVercel,
    repo: repoSlug(),
    branch: branchName(),
    path: CATALOG_PATH,
  };
}

function repoSlug() {
  const explicit = process.env.CATALOG_GITHUB_REPO?.trim();
  if (explicit) return explicit;
  const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim();
  const slug = process.env.VERCEL_GIT_REPO_SLUG?.trim();
  if (owner && slug) return `${owner}/${slug}`;
  return "Cbiux/Cbiux-Suitecase";
}

function branchName() {
  return process.env.CATALOG_GITHUB_BRANCH?.trim() || "catalog";
}

function baseBranch() {
  return process.env.CATALOG_GITHUB_BASE_BRANCH?.trim() || "main";
}

function githubConfigured() {
  return Boolean(process.env.CATALOG_GITHUB_TOKEN?.trim());
}

function localCatalogPath() {
  if (process.env.CATALOG_FILE_PATH?.trim()) return process.env.CATALOG_FILE_PATH.trim();
  if (process.env.VERCEL === "1") return null;
  return path.join(process.cwd(), "data", "catalog.json");
}

export function encryptCatalog(plain: string, secret: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    kind: "cbiux-catalog",
    v: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  });
}

export function decryptCatalog(payload: string, secret: string) {
  try {
    const parsed = JSON.parse(payload) as {
      kind?: string;
      v?: number;
      salt?: string;
      iv?: string;
      tag?: string;
      data?: string;
    };
    if (parsed.kind !== "cbiux-catalog" || parsed.v !== 1) return null;
    if (!parsed.salt || !parsed.iv || !parsed.tag || !parsed.data || !secret) return null;
    const salt = Buffer.from(parsed.salt, "base64");
    const iv = Buffer.from(parsed.iv, "base64");
    const tag = Buffer.from(parsed.tag, "base64");
    const data = Buffer.from(parsed.data, "base64");
    const key = scryptSync(secret, salt, 32);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return plain.trim() ? plain : null;
  } catch {
    return null;
  }
}

function remember(json: string | null) {
  cache = { json, at: Date.now() };
  return json;
}

export async function loadDurableCatalog(options: { fresh?: boolean } = {}): Promise<CatalogLoad> {
  if (!options.fresh && cache && Date.now() - cache.at < CACHE_MS) {
    return { ok: true, json: cache.json };
  }
  const secret = catalogSecret();
  if (!secret) return { ok: false, reason: "NEED_CATALOG_SECRET" };

  try {
    const encrypted = githubConfigured() || process.env.VERCEL === "1" ? await readGitHub() : await readLocalFile();
    if (encrypted == null) {
      remember(null);
      return { ok: true, json: null };
    }
    const json = decryptCatalog(encrypted, secret);
    if (!json) return { ok: false, reason: "CATALOG_DECRYPT_FAILED" };
    remember(json);
    return { ok: true, json };
  } catch (error) {
    const reason = error instanceof Error && error.message === "NEED_CATALOG_TOKEN"
      ? "NEED_CATALOG_TOKEN"
      : "CATALOG_UNREADABLE";
    if (cache?.json) return { ok: true, json: cache.json };
    return { ok: false, reason };
  }
}

export async function saveDurableCatalog(json: string, allowClearPositionIds: number[] = []) {
  const secret = catalogSecret();
  if (!secret) return { ok: false as const, reason: "NEED_CATALOG_SECRET", json };
  if (process.env.VERCEL === "1" && !githubConfigured()) {
    return { ok: false as const, reason: "NEED_CATALOG_TOKEN", json };
  }
  try {
    let payload = json;
    if (githubConfigured()) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const committed = await writeGitHub(encryptCatalog(payload, secret));
        if (committed === "ok") break;
        if (attempt === 1) return { ok: false as const, reason: "CATALOG_SAVE_FAILED", json: payload };
        const latest = await loadDurableCatalog({ fresh: true });
        if (!latest.ok || !latest.json) {
          return { ok: false as const, reason: "CATALOG_SAVE_FAILED", json: payload };
        }
        payload = preserveDroppedLogos(payload, latest.json, allowClearPositionIds);
      }
    } else {
      await writeLocalFile(encryptCatalog(payload, secret));
    }
    remember(payload);
    return { ok: true as const, json: payload };
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : "CATALOG_SAVE_FAILED";
    if (reason === "NEED_CATALOG_TOKEN" || reason === "NEED_CATALOG_SECRET") {
      return { ok: false as const, reason, json };
    }
    console.error("[catalog] durable save failed");
    return { ok: false as const, reason: "CATALOG_SAVE_FAILED", json };
  }
}

async function readLocalFile() {
  const file = localCatalogPath();
  if (!file) return null;
  try {
    const text = await fs.readFile(/*turbopackIgnore: true*/ file, "utf8");
    return text.trim() ? text : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

async function writeLocalFile(encrypted: string) {
  const file = localCatalogPath();
  if (!file) throw new Error("NEED_CATALOG_TOKEN");
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(/*turbopackIgnore: true*/ tmp, encrypted);
  await fs.rename(/*turbopackIgnore: true*/ tmp, file);
}

type GitRef = { commitSha: string; treeSha: string };

async function github(
  pathAndQuery: string,
  init: RequestInit & { accept?: string } = {},
) {
  const token = process.env.CATALOG_GITHUB_TOKEN?.trim();
  if (!token) throw new Error("NEED_CATALOG_TOKEN");
  const { accept, headers, ...rest } = init;
  const response = await fetch(`https://api.github.com${pathAndQuery}`, {
    ...rest,
    headers: {
      Accept: accept || "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "cbiux-suitcase",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  return { status: response.status, text };
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function readGitHub() {
  const repo = repoSlug();
  const branch = branchName();
  const token = process.env.CATALOG_GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "cbiux-suitcase",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${CATALOG_PATH}?ref=${encodeURIComponent(branch)}`,
    { headers, signal: AbortSignal.timeout(20_000) },
  );
  if (response.status === 404) return null;
  const text = await response.text();
  if (response.status < 200 || response.status >= 300) throw new Error("CATALOG_UNREADABLE");
  return text.trim() ? text : null;
}

async function getRef(branch: string): Promise<GitRef | null> {
  const repo = repoSlug();
  const response = await github(`/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  if (response.status === 404) return null;
  if (response.status < 200 || response.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  const data = parseJson<{ object?: { sha?: string } }>(response.text);
  const commitSha = data?.object?.sha;
  if (!commitSha) throw new Error("CATALOG_SAVE_FAILED");
  const commit = await github(`/repos/${repo}/git/commits/${commitSha}`);
  if (commit.status < 200 || commit.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  const commitJson = parseJson<{ tree?: { sha?: string } }>(commit.text);
  const treeSha = commitJson?.tree?.sha;
  if (!treeSha) throw new Error("CATALOG_SAVE_FAILED");
  return { commitSha, treeSha };
}

async function ensureCatalogRef(): Promise<GitRef> {
  const existing = await getRef(branchName());
  if (existing) return existing;
  const main = await getRef(baseBranch());
  if (!main) throw new Error("CATALOG_SAVE_FAILED");
  const repo = repoSlug();
  const created = await github(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName()}`,
      sha: main.commitSha,
    }),
  });
  if (created.status === 422) {
    const again = await getRef(branchName());
    if (again) return again;
  }
  if (created.status < 200 || created.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  return main;
}

async function writeGitHub(encrypted: string) {
  const parent = await ensureCatalogRef();
  return commitCatalog(parent, encrypted);
}

async function commitCatalog(parent: GitRef, encrypted: string) {
  const repo = repoSlug();
  const blob = await github(`/repos/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: encrypted, encoding: "utf-8" }),
  });
  if (blob.status < 200 || blob.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  const blobJson = parseJson<{ sha?: string }>(blob.text);
  if (!blobJson?.sha) throw new Error("CATALOG_SAVE_FAILED");
  const tree = await github(`/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parent.treeSha,
      tree: [
        {
          path: CATALOG_PATH,
          mode: "100644",
          type: "blob",
          sha: blobJson.sha,
        },
      ],
    }),
  });
  if (tree.status < 200 || tree.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  const treeJson = parseJson<{ sha?: string }>(tree.text);
  if (!treeJson?.sha) throw new Error("CATALOG_SAVE_FAILED");
  const commit = await github(`/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "Save sponsor catalog backup",
      tree: treeJson.sha,
      parents: [parent.commitSha],
    }),
  });
  if (commit.status < 200 || commit.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  const commitJson = parseJson<{ sha?: string }>(commit.text);
  if (!commitJson?.sha) throw new Error("CATALOG_SAVE_FAILED");
  const updated = await github(`/repos/${repo}/git/refs/heads/${encodeURIComponent(branchName())}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitJson.sha, force: false }),
  });
  if (updated.status === 422 || updated.status === 409) return "conflict" as const;
  if (updated.status < 200 || updated.status >= 300) throw new Error("CATALOG_SAVE_FAILED");
  return "ok" as const;
}
