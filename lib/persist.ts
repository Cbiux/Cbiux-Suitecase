import { promises as fs } from "fs";
import path from "path";
import type { StoreShape } from "./types";

const REDIS_KEY = "cbiux-store";

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

export async function loadStoreRaw(): Promise<string | null> {
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
  const redis = await redisClient();
  if (redis) {
    await redis.set(REDIS_KEY, json);
    return;
  }
  const file = filePath();
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await fs.writeFile(/*turbopackIgnore: true*/ file, json);
}
