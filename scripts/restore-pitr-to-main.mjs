import fs from "fs";
import { neon } from "@neondatabase/serverless";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function summarize(parsed) {
  let sold = 0;
  let reserved = 0;
  let available = 0;
  let named = 0;
  let logos = 0;
  for (const state of Object.values(parsed.positions ?? {})) {
    if (!state || typeof state !== "object") continue;
    if (state.status === "sold") sold += 1;
    else if (state.status === "reserved") reserved += 1;
    else available += 1;
    if (String(state.sponsor || "").trim()) named += 1;
    if (String(state.logo || "").trim()) logos += 1;
  }
  return {
    sold,
    reserved,
    available,
    named,
    logos,
    payments: Array.isArray(parsed.payments) ? parsed.payments.length : 0,
    offers: Array.isArray(parsed.offers) ? parsed.offers.length : 0,
    updatedAt: parsed.updatedAt ?? null,
    positionKeys: Object.keys(parsed.positions ?? {}).length,
  };
}

loadEnv(".env.local");
loadEnv(".env.neon.check");

const backupPath = "data/pitr-backup.json";
if (!fs.existsSync(backupPath)) {
  console.log(JSON.stringify({ ok: false, reason: "NO_BACKUP" }));
  process.exit(1);
}

const raw = fs.readFileSync(backupPath, "utf8");
let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  console.log(JSON.stringify({ ok: false, reason: "INVALID_BACKUP" }));
  process.exit(1);
}

const stats = summarize(parsed);
if (stats.sold < 1 && stats.named < 1) {
  console.log(JSON.stringify({ ok: false, reason: "BACKUP_EMPTY", stats }));
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log(JSON.stringify({ ok: false, reason: "NO_DATABASE_URL" }));
  process.exit(1);
}

const sql = neon(databaseUrl, { fetchOptions: { timeout: 120_000 } });
await sql`
  CREATE TABLE IF NOT EXISTS store_blob (
    id text PRIMARY KEY,
    payload text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  INSERT INTO store_blob (id, payload, updated_at)
  VALUES ('cbiux-store', ${raw}, now())
  ON CONFLICT (id) DO UPDATE
  SET payload = EXCLUDED.payload,
      updated_at = now()
`;

const check = await sql`
  SELECT length(payload) AS n, updated_at FROM store_blob WHERE id = 'cbiux-store' LIMIT 1
`;

console.log(
  JSON.stringify({
    ok: true,
    stats,
    writtenChars: Number(check[0]?.n ?? 0),
    tableUpdatedAt: check[0]?.updated_at ?? null,
  }),
);
