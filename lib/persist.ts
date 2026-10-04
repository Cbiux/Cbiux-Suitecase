import { promises as fs } from "fs";
import path from "path";
import { get as getBlob, head as headBlob, put as putBlob } from "@vercel/blob";
import {
  loadDurableCatalog,
  resetDurableCatalogForTests,
  saveDurableCatalog,
} from "./catalog-git";
import { inventoryLooksEmpty, preserveDroppedLogos } from "./catalog-snapshot";
import type { StoreShape } from "./types";

export type PersistOptions = {
  allowClearPositionIds?: number[];
  allowEmpty?: boolean;
};

export { inventoryLooksEmpty };

const REDIS_KEY = "cbiux-store";
const NEON_KEY = "cbiux-store";
const BLOB_PATH = "cbiux-store.json";
const NEON_QUOTA_COOLDOWN_MS = 6 * 60 * 60_000;

let memoryCache: string | null = null;
let neonReady: Promise<void> | null = null;
let neonBlockedUntil = 0;

function neonConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim()) && Date.now() >= neonBlockedUntil;
}

function redisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function filePath() {
  if (process.env.STORE_PATH) return process.env.STORE_PATH;
  if (process.env.VERCEL === "1") return path.join("/tmp", "cbiux-store.json");
  return path.join(process.cwd(), "data", "store.json");
}

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("402") || /exceeded the quota/i.test(message);
}

function rememberNeonFailure(error: unknown) {
  if (!isQuotaError(error)) return;
  neonBlockedUntil = Date.now() + NEON_QUOTA_COOLDOWN_MS;
  neonReady = null;
  console.error(
    "[persist] Neon quota exceeded; cooling down until",
    new Date(neonBlockedUntil).toISOString(),
  );
}

async function redisClient() {
  if (!redisConfigured()) return null;
  const { Redis } = await import("@upstash/redis");
  return Redis.fromEnv();
}

async function neonSql() {
  if (!neonConfigured()) return null;
  const { neon } = await import("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL!);
}

async function ensureNeonTable() {
  const sql = await neonSql();
  if (!sql) return;
  if (!neonReady) {
    neonReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS store_blob (
          id text PRIMARY KEY,
          payload text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })().catch((error) => {
      neonReady = null;
      rememberNeonFailure(error);
      throw error;
    });
  }
  await neonReady;
}

function asPayload(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function blobHasStoredInventory() {
  if (!blobConfigured()) return false;
  try {
    const meta = await headBlob(BLOB_PATH);
    return (meta?.size ?? 0) > 50_000;
  } catch {
    return false;
  }
}

async function loadFromBlob(): Promise<string | null> {
  if (!blobConfigured()) return null;
  const result = await getBlob(BLOB_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return text.trim() ? text : null;
}

async function saveToBlob(json: string) {
  if (!blobConfigured()) return false;
  await putBlob(BLOB_PATH, json, {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return true;
}

async function loadFromRedis(): Promise<string | null> {
  const redis = await redisClient();
  if (!redis) return null;
  const value = await redis.get<string | StoreShape>(REDIS_KEY);
  if (value == null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function loadFromNeon(): Promise<string | null> {
  if (!neonConfigured()) return null;
  await ensureNeonTable();
  const sql = await neonSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT payload FROM store_blob WHERE id = ${NEON_KEY} LIMIT 1
  `;
  return asPayload(rows[0]?.payload);
}

async function loadFromFile(): Promise<string | null> {
  try {
    return await fs.readFile(/*turbopackIgnore: true*/ filePath(), "utf8");
  } catch {
    return null;
  }
}

function keep(raw: string | null) {
  if (!raw || inventoryLooksEmpty(raw)) return null;
  memoryCache = raw;
  return raw;
}

export function resetPersistStateForTests() {
  memoryCache = null;
  neonBlockedUntil = 0;
  neonReady = null;
  resetDurableCatalogForTests();
}

export async function loadStoreRaw(): Promise<string | null> {
  // Git catalog is the copy that still exists when Neon answers 402 and Blob is suspended.
  const durable = await loadDurableCatalog();
  if (durable.ok) {
    const cached = keep(durable.json);
    if (cached) return cached;
  } else if (memoryCache && !inventoryLooksEmpty(memoryCache)) {
    return memoryCache;
  }

  try {
    const neonValue = keep(await loadFromNeon());
    if (neonValue) return neonValue;
  } catch (error) {
    rememberNeonFailure(error);
    console.error("[persist] neon read failed");
  }

  try {
    const redisValue = keep(await loadFromRedis());
    if (redisValue) return redisValue;
  } catch (error) {
    console.error("[persist] redis read failed", error instanceof Error ? error.message : "");
  }

  try {
    const blobValue = keep(await loadFromBlob());
    if (blobValue) return blobValue;
  } catch (error) {
    console.error("[persist] blob read failed", error instanceof Error ? error.message : "");
  }

  if (memoryCache && !inventoryLooksEmpty(memoryCache)) return memoryCache;
  const fileValue = keep(await loadFromFile());
  if (fileValue) return fileValue;
  if (!durable.ok) {
    throw new Error(
      durable.reason === "NEED_CATALOG_SECRET" ? "NEED_CATALOG_SECRET" : "CATALOG_UNREADABLE",
    );
  }
  return null;
}

export async function restoreFromNeon() {
  neonBlockedUntil = 0;
  neonReady = null;
  if (!process.env.DATABASE_URL?.trim()) {
    return { restored: false as const, reason: "NO_DATABASE_URL" };
  }
  let raw: string | null = null;
  try {
    raw = await loadFromNeon();
  } catch (error) {
    rememberNeonFailure(error);
    const message = error instanceof Error ? error.message : "";
    return {
      restored: false as const,
      reason: isQuotaError(error) || /quota/i.test(message) ? "NEON_QUOTA" : "NEON_READ_FAILED",
    };
  }
  if (!raw) return { restored: false as const, reason: "NEON_EMPTY" };

  await saveStoreRaw(raw);
  let sold = 0;
  let reserved = 0;
  let available = 0;
  let payments = 0;
  let offers = 0;
  try {
    const parsed = JSON.parse(raw) as StoreShape;
    for (const state of Object.values(parsed.positions ?? {})) {
      if (state.status === "sold") sold += 1;
      else if (state.status === "reserved") reserved += 1;
      else available += 1;
    }
    payments = parsed.payments?.length ?? 0;
    offers = parsed.offers?.length ?? 0;
  } catch {
    return { restored: false as const, reason: "NEON_INVALID" };
  }
  return { restored: true as const, sold, reserved, available, payments, offers };
}

async function saveToRedis(json: string) {
  const redis = await redisClient();
  if (!redis) return false;
  await redis.set(REDIS_KEY, json);
  return true;
}

async function saveToNeon(json: string) {
  if (!neonConfigured()) return false;
  await ensureNeonTable();
  const sql = await neonSql();
  if (!sql) return false;
  await sql`
    INSERT INTO store_blob (id, payload, updated_at)
    VALUES (${NEON_KEY}, ${json}, now())
    ON CONFLICT (id) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = now()
  `;
  return true;
}

async function saveToFile(json: string) {
  const file = filePath();
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await fs.writeFile(/*turbopackIgnore: true*/ file, json);
}

async function knownReplicaHasInventory() {
  try {
    const existing = memoryCache || (await loadFromNeon());
    if (existing && !inventoryLooksEmpty(existing)) return true;
  } catch (error) {
    rememberNeonFailure(error);
  }
  return blobHasStoredInventory();
}

async function replicateStore(json: string) {
  try {
    await saveToNeon(json);
  } catch (error) {
    rememberNeonFailure(error);
    console.error("[persist] neon write failed");
  }
  try {
    await saveToRedis(json);
  } catch (error) {
    console.error("[persist] redis write failed", error instanceof Error ? error.message : "");
  }
  try {
    await saveToBlob(json);
  } catch (error) {
    console.error("[persist] blob write failed", error instanceof Error ? error.message : "");
  }
  try {
    await saveToFile(json);
  } catch (error) {
    console.error("[persist] file write failed", error instanceof Error ? error.message : "");
  }
}

export async function saveStoreRaw(json: string, options: PersistOptions = {}) {
  if (process.env.VERCEL === "1" && !process.env.CATALOG_GITHUB_TOKEN?.trim()) {
    throw new Error("NEED_CATALOG_TOKEN");
  }
  const allowClear = options.allowClearPositionIds ?? [];
  const durable = await loadDurableCatalog({ fresh: true });
  if (!durable.ok) {
    if (!memoryCache || inventoryLooksEmpty(memoryCache)) {
      throw new Error(
        durable.reason === "NEED_CATALOG_TOKEN" || durable.reason === "NEED_CATALOG_SECRET"
          ? durable.reason
          : "CATALOG_UNREADABLE",
      );
    }
    json = preserveDroppedLogos(json, memoryCache, allowClear);
  } else if (durable.json) {
    json = preserveDroppedLogos(json, durable.json, allowClear);
    const clearing = allowClear.length > 0 || options.allowEmpty === true;
    if (!clearing && inventoryLooksEmpty(json) && !inventoryLooksEmpty(durable.json)) {
      console.error("[persist] refusing to overwrite a stored inventory with an empty catalog");
      throw new Error("REFUSE_EMPTY_STORE");
    }
  }

  if (inventoryLooksEmpty(json) && !options.allowEmpty && allowClear.length === 0) {
    if (await knownReplicaHasInventory()) {
      console.error("[persist] refusing to overwrite a stored inventory with an empty catalog");
      throw new Error("REFUSE_EMPTY_STORE");
    }
  }

  const saved = await saveDurableCatalog(json, allowClear);
  if (!saved.ok) {
    throw new Error(
      saved.reason === "NEED_CATALOG_TOKEN" || saved.reason === "NEED_CATALOG_SECRET"
        ? saved.reason
        : "CATALOG_SAVE_FAILED",
    );
  }

  memoryCache = saved.json;
  await replicateStore(saved.json);
}
