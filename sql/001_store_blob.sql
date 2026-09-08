-- Store durable inventory for cbiux-suitcase (Neon / Postgres).
-- Applied automatically on first read/write via lib/persist.ts.

CREATE TABLE IF NOT EXISTS store_blob (
  id text PRIMARY KEY,
  payload text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
