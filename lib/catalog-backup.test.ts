import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import test from "node:test";
import { decryptCatalog, encryptCatalog } from "./catalog-git";
import { inventoryLooksEmpty, preserveDroppedLogos } from "./catalog-snapshot";
import { loadStoreRaw, resetPersistStateForTests, saveStoreRaw } from "./persist";
import { adminUpdateSpot } from "./store";
import type { PositionState, StoreShape } from "./types";

const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const ENV_KEYS = [
  "CATALOG_SECRET",
  "CATALOG_FILE_PATH",
  "CATALOG_GITHUB_TOKEN",
  "CATALOG_GITHUB_REPO",
  "CATALOG_GITHUB_BRANCH",
  "VERCEL",
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "ADMIN_PASSWORD",
] as const;

function blank(): PositionState {
  return {
    status: "available",
    sponsor: "",
    email: "",
    phone: "",
    logo: "",
    reservedAt: "",
    reservedUntil: "",
    recoveryToken: "",
    txHash: "",
    network: "",
    checkoutToken: "",
    comprobante: "",
    thanksEmailSentAt: "",
    receivedAmount: 0,
    receivedConfirmedAt: "",
    receivedMethod: "",
    receivedCurrency: "",
    receivedInKindItems: "",
    mergeGroup: 0,
  };
}

function storeWith(spots: Record<string, Partial<PositionState>>): StoreShape {
  const positions: StoreShape["positions"] = {};
  for (const [id, patch] of Object.entries(spots)) {
    positions[id] = { ...blank(), ...patch };
  }
  return {
    positions,
    payments: [],
    offers: [],
    updatedAt: "2026-10-04T00:00:00.000Z",
  };
}

async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) previous.set(key, process.env[key]);
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetPersistStateForTests();
  try {
    await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetPersistStateForTests();
  }
}

test("encrypts the catalog and refuses a wrong secret", () => {
  const encrypted = encryptCatalog('{"positions":{}}', "secret-a");
  assert.equal(decryptCatalog(encrypted, "secret-a"), '{"positions":{}}');
  assert.equal(decryptCatalog(encrypted, "secret-b"), null);
  assert.equal(encrypted.includes("positions"), false);
});

test("a second logo does not drop the first when the incoming store was an empty seed", () => {
  const existing = JSON.stringify(
    storeWith({ "1": { status: "sold", sponsor: "Alpha", logo: LOGO } }),
  );
  const incoming = JSON.stringify(
    storeWith({ "2": { status: "sold", sponsor: "Beta", logo: LOGO } }),
  );
  const merged = JSON.parse(preserveDroppedLogos(incoming, existing)) as StoreShape;
  assert.equal(merged.positions["1"].sponsor, "Alpha");
  assert.equal(merged.positions["1"].logo, LOGO);
  assert.equal(merged.positions["2"].sponsor, "Beta");
  assert.equal(merged.positions["2"].logo, LOGO);
  assert.equal(inventoryLooksEmpty(JSON.stringify(merged)), false);
});

test("an intentional clear can drop one logo and still keep the other", () => {
  const existing = JSON.stringify(
    storeWith({
      "1": { status: "sold", sponsor: "Alpha", logo: LOGO },
      "2": { status: "sold", sponsor: "Beta", logo: LOGO },
    }),
  );
  const incoming = JSON.stringify(
    storeWith({ "1": { status: "sold", sponsor: "Alpha", logo: LOGO }, "2": blank() }),
  );
  const merged = JSON.parse(preserveDroppedLogos(incoming, existing, [2])) as StoreShape;
  assert.equal(merged.positions["1"].sponsor, "Alpha");
  assert.equal(merged.positions["2"].sponsor, "");
  assert.equal(merged.positions["2"].logo, "");
});

test("file catalog keeps both admin saves when neon and blob are absent", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cbiux-catalog-"));
  try {
    await withEnv(
      {
        CATALOG_SECRET: "test-secret",
        CATALOG_FILE_PATH: path.join(dir, "catalog.json"),
        CATALOG_GITHUB_TOKEN: undefined,
        VERCEL: undefined,
        DATABASE_URL: undefined,
        BLOB_READ_WRITE_TOKEN: undefined,
      },
      async () => {
        await adminUpdateSpot({ positionId: 1, status: "sold", sponsor: "Alpha", logo: LOGO });
        resetPersistStateForTests();
        await adminUpdateSpot({ positionId: 2, status: "sold", sponsor: "Beta", logo: LOGO });
        resetPersistStateForTests();
        const raw = await loadStoreRaw();
        assert.ok(raw);
        const store = JSON.parse(raw) as StoreShape;
        assert.equal(store.positions["1"].sponsor, "Alpha");
        assert.equal(store.positions["1"].logo, LOGO);
        assert.equal(store.positions["2"].sponsor, "Beta");
        assert.equal(store.positions["2"].logo, LOGO);

        const empty = storeWith({});
        try {
          await saveStoreRaw(JSON.stringify(empty));
        } catch (error) {
          assert.match((error as Error).message, /REFUSE_EMPTY_STORE/);
        }
        resetPersistStateForTests();
        const after = JSON.parse((await loadStoreRaw()) || "{}") as StoreShape;
        assert.equal(after.positions["1"].sponsor, "Alpha");
        assert.equal(after.positions["1"].logo, LOGO);
        assert.equal(after.positions["2"].sponsor, "Beta");
        assert.equal(after.positions["2"].logo, LOGO);
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

type GitState = {
  blobs: Map<string, string>;
  trees: Map<string, Record<string, string>>;
  commits: Map<string, { tree: string; parent: string | null }>;
  catalogHead: string | null;
  seq: number;
};

function gitState(): GitState {
  const state: GitState = {
    blobs: new Map(),
    trees: new Map([["tree-main", {}]]),
    commits: new Map([["main-sha", { tree: "tree-main", parent: null }]]),
    catalogHead: null,
    seq: 1,
  };
  return state;
}

function installGitHub(state: GitState) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    if (!url.includes("api.github.com")) {
      const status = url.includes("blob") ? 403 : 402;
      return new Response(status === 403 ? "suspended" : "402 exceeded the quota", { status });
    }
    return githubResponse(state, url, method, init);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function githubResponse(state: GitState, url: string, method: string, init?: RequestInit) {
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  if (url.includes("/contents/") && method === "GET") {
    if (!state.catalogHead) return new Response("missing", { status: 404 });
    const commit = state.commits.get(state.catalogHead);
    const blobSha = commit ? state.trees.get(commit.tree)?.["data/catalog.json"] : undefined;
    if (!blobSha) return new Response("missing", { status: 404 });
    return new Response(state.blobs.get(blobSha) || "", { status: 200 });
  }
  const ref = url.match(/\/git\/ref\/heads\/([^/?]+)/);
  if (ref && method === "GET") {
    const branch = decodeURIComponent(ref[1]);
    const sha = branch === "main" ? "main-sha" : state.catalogHead;
    if (!sha) return new Response("missing", { status: 404 });
    return Response.json({ object: { sha, type: "commit" } });
  }
  const commitUrl = url.match(/\/git\/commits\/([^/?]+)/);
  if (commitUrl && method === "GET") {
    const commit = state.commits.get(commitUrl[1]);
    if (!commit) return new Response("missing", { status: 404 });
    return Response.json({ sha: commitUrl[1], tree: { sha: commit.tree } });
  }
  if (url.endsWith("/git/blobs") && method === "POST") {
    const sha = `blob-${state.seq++}`;
    state.blobs.set(sha, String(body.content || ""));
    return Response.json({ sha });
  }
  if (url.endsWith("/git/trees") && method === "POST") {
    const base = { ...(state.trees.get(String(body.base_tree)) || {}) };
    for (const item of (body.tree as Array<{ path: string; sha: string }>) || []) {
      base[item.path] = item.sha;
    }
    const sha = `tree-${state.seq++}`;
    state.trees.set(sha, base);
    return Response.json({ sha });
  }
  if (url.endsWith("/git/commits") && method === "POST") {
    const sha = `commit-${state.seq++}`;
    const parents = (body.parents as string[]) || [];
    state.commits.set(sha, { tree: String(body.tree), parent: parents[0] ?? null });
    return Response.json({ sha });
  }
  if (url.endsWith("/git/refs") && method === "POST") {
    if (state.catalogHead) return new Response("exists", { status: 422 });
    state.catalogHead = String(body.sha);
    return Response.json({ object: { sha: body.sha } }, { status: 201 });
  }
  if (url.includes("/git/refs/heads/") && method === "PATCH") {
    const sha = String(body.sha);
    const commit = state.commits.get(sha);
    if (!commit || commit.parent !== state.catalogHead) {
      return new Response("not fast-forward", { status: 422 });
    }
    state.catalogHead = sha;
    return Response.json({ object: { sha } });
  }
  return new Response("unmocked", { status: 500 });
}

test("git catalog is what /api/positions reads when neon returns 402 and blob returns 403", async () => {
  const state = gitState();
  const restore = installGitHub(state);
  try {
    await withEnv(
      {
        CATALOG_SECRET: "test-secret",
        CATALOG_GITHUB_TOKEN: "ghs_test",
        CATALOG_GITHUB_REPO: "Cbiux/Cbiux-Suitecase",
        CATALOG_GITHUB_BRANCH: "catalog",
        CATALOG_FILE_PATH: undefined,
        VERCEL: "1",
        DATABASE_URL: "postgresql://user:pass@127.0.0.1:1/neondb",
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
      },
      async () => {
        await adminUpdateSpot({ positionId: 1, status: "sold", sponsor: "Alpha", logo: LOGO });
        resetPersistStateForTests();
        await adminUpdateSpot({ positionId: 2, status: "sold", sponsor: "Beta", logo: LOGO });
        resetPersistStateForTests();
        const raw = await loadStoreRaw();
        assert.ok(raw);
        const store = JSON.parse(raw) as StoreShape;
        assert.equal(store.positions["1"].sponsor, "Alpha");
        assert.equal(store.positions["1"].logo, LOGO);
        assert.equal(store.positions["2"].sponsor, "Beta");
        assert.equal(store.positions["2"].logo, LOGO);
        assert.ok(state.catalogHead);
        assert.notEqual(state.catalogHead, "main-sha");
      },
    );
  } finally {
    restore();
  }
});

test("vercel refuses a logo save when the github token is missing", async () => {
  await withEnv(
    {
      CATALOG_SECRET: "test-secret",
      CATALOG_GITHUB_TOKEN: undefined,
      VERCEL: "1",
      DATABASE_URL: undefined,
      BLOB_READ_WRITE_TOKEN: undefined,
      CATALOG_FILE_PATH: undefined,
    },
    async () => {
      await assert.rejects(
        () => adminUpdateSpot({ positionId: 3, status: "sold", sponsor: "Gamma", logo: LOGO }),
        /NEED_CATALOG_TOKEN/,
      );
    },
  );
});
