import fs from "fs";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

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

loadEnv(".env.neon.check");
loadEnv(".env.restore.tmp");

const databaseUrl = process.env.DATABASE_URL?.trim();
const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!databaseUrl || !blobToken) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "MISSING_ENV",
      hasDatabase: Boolean(databaseUrl),
      hasBlob: Boolean(blobToken),
    }),
  );
  process.exit(1);
}

const sql = neon(databaseUrl, { fetchOptions: { timeout: 120_000 } });
const rows = await sql`
  SELECT payload FROM store_blob WHERE id = 'cbiux-store' LIMIT 1
`;
const raw = rows[0]?.payload;
if (typeof raw !== "string" || !raw.trim()) {
  console.log(JSON.stringify({ ok: false, reason: "NEON_EMPTY" }));
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  console.log(JSON.stringify({ ok: false, reason: "NEON_INVALID", chars: raw.length }));
  process.exit(1);
}

let sold = 0;
let reserved = 0;
let available = 0;
for (const state of Object.values(parsed.positions ?? {})) {
  const status = state && typeof state === "object" ? state.status : "";
  if (status === "sold") sold += 1;
  else if (status === "reserved") reserved += 1;
  else available += 1;
}

await put("cbiux-store.json", raw, {
  access: "private",
  allowOverwrite: true,
  addRandomSuffix: false,
  contentType: "application/json",
  token: blobToken,
  cacheControlMaxAge: 60,
});

console.log(
  JSON.stringify({
    ok: true,
    chars: raw.length,
    sold,
    reserved,
    available,
    payments: Array.isArray(parsed.payments) ? parsed.payments.length : 0,
    offers: Array.isArray(parsed.offers) ? parsed.offers.length : 0,
    updatedAt: parsed.updatedAt ?? null,
  }),
);
