import fs from "fs";
import { neon } from "@neondatabase/serverless";

function readUrl() {
  const text = fs.readFileSync(".env.neon.check", "utf8");
  const line = text.split(/\n/).find((item) => item.startsWith("DATABASE_URL="));
  if (!line) return "";
  let url = line.slice("DATABASE_URL=".length).trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1);
  }
  return url;
}

function summarize(url) {
  try {
    const parsed = new URL(url.replace(/^postgresql:/, "http:"));
    return {
      protocol: url.startsWith("postgres") ? "postgres" : "other",
      host: parsed.hostname,
      db: parsed.pathname.replace(/^\//, ""),
      hasUser: Boolean(parsed.username),
      hasPass: Boolean(parsed.password),
      sslmode: parsed.searchParams.get("sslmode") || "",
    };
  } catch {
    return { protocol: "unparsed" };
  }
}

function clean(error) {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return raw.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgres://***");
}

const url = readUrl();
if (!url) {
  console.log(JSON.stringify({ ok: false, reason: "NO_DATABASE_URL" }));
  process.exit(1);
}

const info = summarize(url);
const sql = neon(url);

try {
  const ping = await sql`SELECT 1 AS ok`;
  let table = false;
  let payloadChars = 0;
  let updatedAt = null;
  try {
    const rows = await sql`
      SELECT length(payload) AS n, updated_at
      FROM store_blob
      WHERE id = 'cbiux-store'
      LIMIT 1
    `;
    table = true;
    payloadChars = Number(rows[0]?.n ?? 0);
    updatedAt = rows[0]?.updated_at ?? null;
  } catch (error) {
    console.log(
      JSON.stringify({
        ok: false,
        stage: "select_store",
        info,
        ping,
        error: clean(error),
      }),
    );
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      info,
      ping,
      table,
      payloadChars,
      updatedAt,
    }),
  );
} catch (error) {
  console.log(JSON.stringify({ ok: false, stage: "ping", info, error: clean(error) }));
  process.exit(1);
}
