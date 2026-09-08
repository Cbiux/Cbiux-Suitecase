import { promises as fs } from "fs";
import path from "path";
import type { StoreShape } from "./types";

const REDIS_KEY = "cbiux-store";
const NEON_KEY = "cbiux-store";

function neonConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function redisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function filePath() {
  if (process.env.STORE_PATH) return process.env.STORE_PATH;
  if (process.env.VERCEL === "1") return path.join("/tmp", "cbiux-store.json");
  return path.join(process.cwd(), "data", "store.json");
}

async function redisClient() {
  if (!redisConfigured()) return null;
  const { Redis } = await import("@upstash/redis");
  return Redis.fromEnv();
}

let neonReady: Promise<void> | null = null;

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
      throw error;
    });
  }
  await neonReady;
}

export async function loadStoreRaw(): Promise<string | null> {
  // Prefer Neon (durable Postgres). Fall back to Redis, then local/tmp file.
  if (neonConfigured()) {
    try {
      await ensureNeonTable();
      const sql = await neonSql();
      if (sql) {
        const rows = await sql`
          SELECT payload FROM store_blob WHERE id = ${NEON_KEY} LIMIT 1
        `;
        const payload = rows[0]?.payload;
        if (typeof payload === "string") return payload;
        return null;
      }
    } catch (error) {
      console.error("[persist] Neon load failed:", error);
      // Fall through to Redis/file so local/dev still works if Neon is misconfigured.
    }
  }

  const redis = await redisClient();
  if (redis) {
    const value = await redis.get<string | StoreShape>(REDIS_KEY);
    if (value == null) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  try {
    return await fs.readFile(/*turbopackIgnore: true*/ filePath(), "utf8");
  } catch {
    return null;
  }
}

export async function saveStoreRaw(json: string) {
  if (neonConfigured()) {
    try {
      await ensureNeonTable();
      const sql = await neonSql();
      if (sql) {
        await sql`
          INSERT INTO store_blob (id, payload, updated_at)
          VALUES (${NEON_KEY}, ${json}, now())
          ON CONFLICT (id) DO UPDATE
          SET payload = EXCLUDED.payload,
              updated_at = now()
        `;
        return;
      }
    } catch (error) {
      console.error("[persist] Neon save failed:", error);
      throw error;
    }
  }

  const redis = await redisClient();
  if (redis) {
    await redis.set(REDIS_KEY, json);
    return;
  }
  const file = filePath();
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await fs.writeFile(/*turbopackIgnore: true*/ file, json);
}
