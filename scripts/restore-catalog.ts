import { readFile } from "fs/promises";
import { decryptCatalog } from "../lib/catalog-git";
import type { StoreShape } from "../lib/types";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: npx tsx scripts/restore-catalog.ts <catalog.json>");
    process.exit(1);
  }

  const secret = process.env.CATALOG_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "";
  if (!secret) {
    console.error("Definí CATALOG_SECRET o ADMIN_PASSWORD (la misma clave con la que se cifró).");
    process.exit(1);
  }

  const payload = await readFile(file, "utf8");
  const plain = decryptCatalog(payload, secret);
  if (!plain) {
    console.error("No se pudo descifrar. La clave no coincide o el archivo no es una copia cbiux-catalog.");
    process.exit(1);
  }

  const store = JSON.parse(plain) as StoreShape;
  console.log(`updatedAt\t${store.updatedAt || ""}`);
  for (const [id, state] of Object.entries(store.positions ?? {})) {
    const sponsor = String(state?.sponsor || "").trim();
    const logo = String(state?.logo || "").trim();
    if (!sponsor && !logo && state?.status !== "sold" && state?.status !== "reserved") continue;
    console.log(`${id}\t${state?.status || ""}\t${sponsor}\t${logo ? "logo" : "sin-logo"}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
