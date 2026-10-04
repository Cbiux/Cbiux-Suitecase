# Cbiux suitcase — Costa Rica → Europa → India 2026

Landing de patrocinio para la **maleta de cabina** (carry-on, ~55×40×20 cm) de **Sebastián Ceciliano Piedra (Cbiux)**. No es una maleta de bodega. 22 posiciones numeradas, precios pensados para PYMEs de Costa Rica y marcas tech, pago en SINPE o USDC.

Plataforma **clara** de default (blanco / texto negro), mobile-first, con **modo oscuro** (carbón / texto claro). El toggle sol/luna vive en el header; la preferencia se guarda en `localStorage` (`cbiux-theme`) y, si no hay una guardada, respeta `prefers-color-scheme`. Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. El picker es un layout fotográfico de 4 vistas (frente / reverso / izq / der) con overlays numerados y zoom CSS. No hay modelo 3D.

## Correr en local

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 43147
```

Abrí [http://localhost:43147](http://localhost:43147). El UI arranca en español; el toggle ES/EN y el de Día/Noche están en el header.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL canónica (OG / metadata) |
| `NEXT_PUBLIC_SINPE_PHONE` | SINPE Móvil. Default: `84358038` |
| `NEXT_PUBLIC_USDC_BASE_ADDRESS` | Wallet EVM/Base USDC. Default: `0xC385…C188` |
| `NEXT_PUBLIC_USDC_STELLAR_ADDRESS` | Wallet Stellar USDC. Default: `GAS52…5BS` |
| `NEXT_PUBLIC_USDC_SOLANA_ADDRESS` | Wallet Solana (opcional, vacío si no hay) |
| `ADMIN_PASSWORD` | Clave de `/admin` |
| `DATABASE_URL` | Neon Postgres, réplica opcional. Un 402 ya no vacía el sitio |
| `BLOB_READ_WRITE_TOKEN` | Blob, réplica opcional. Un 403 ya no vacía el sitio |
| `CATALOG_GITHUB_TOKEN` | Token de GitHub (Contents read/write). Obligatorio en Vercel para guardar logos |
| `CATALOG_SECRET` | Clave para cifrar la copia. Si falta, se usa `ADMIN_PASSWORD` |
| `UPSTASH_REDIS_REST_URL` | Redis legacy (réplica opcional) |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash |
| `PAYMENT_VERIFY_MODE` | `stub` (default) o `indexer` |
| `NEXT_PUBLIC_HELIO_PAY_URL` | Paylink de Helio (opcional) |
| `STORE_PATH` | Ruta opcional del JSON de inventario |

Las direcciones públicas de SINPE, EVM y Stellar están hardcodeadas en `lib/config.ts` y se muestran aunque no haya env. Solana no se inventa: solo aparece si seteás la variable.

Si `ADMIN_PASSWORD` no está definida, `/admin` acepta `123Cbiux@#$`.

## Deploy en Vercel

1. Importá el repo en Vercel (framework: Next.js).
2. Cargá las env vars de arriba.
3. Deploy.

El inventario que ve el sitio se lee **primero** desde la copia en git (rama `catalog`, archivo `data/catalog.json`). Neon, Blob y Redis quedan como réplicas opcionales. En Vercel hace falta `CATALOG_GITHUB_TOKEN`: sin ese token un guardado no puede escribir la copia y el admin muestra el error en lugar de fingir que `/tmp` alcanzó. Ver [Copia durable](#copia-durable-git).

## Cómo se paga y se verifica

El checkout ofrece tres métodos reales:

1. **SINPE Móvil** al `84358038` (colones o USD). El sponsor **tiene que subir una foto o captura del comprobante**. Sin imagen no se acepta. El spot queda `reserved` 48 h. Sebastián revisa el comprobante en `/admin` y lo marca `sold` o lo rechaza.
2. **USDC en EVM / Base** a `0xC38555a1Afcd8394532Caa11D0be60Df166eC188`. El sponsor **tiene que subir una captura del pago**.
3. **USDC en Stellar** a `GAS52QOWKVBW2WYDRQ3KS4CSJ2QQNALPGURK2HLGJSNE2XUH7BH555BS`. El sponsor **tiene que subir una captura del pago**.

Flujo:

1. Elegí una posición, dejá el nombre de la marca y **adjuntá el diseño** (PNG, WebP, JPG o SVG).
2. El spot queda **reserved** y el diseño aparece ya en la maleta del sitio.
3. Pagá por SINPE o USDC. En SINPE incluí el memo `CBIUX-01` … `CBIUX-22` si el canal lo permite.
4. El sponsor sube el comprobante (SINPE o captura USDC). El spot queda `reserved`. Sebastián lo verifica en `/admin` y lo marca `sold` o lo rechaza.
5. Nada se auto-vende: SINPE y USDC son confirmación manual.

Helio sigue siendo opcional (`NEXT_PUBLIC_HELIO_PAY_URL`).

### TODO: indexer real

`lib/payments.ts` tiene el contrato. Antes de confiar en hashes on-chain:

- **EVM / Base:** Alchemy / Basescan, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- **Stellar:** Horizon, destino.
- Poné `PAYMENT_VERIFY_MODE=indexer` para fallar cerrado hasta que el lookup esté vivo.

## Admin

`/admin` — login con `ADMIN_PASSWORD`. Desde ahí podés:

- marcar un spot `available` / `reserved` / `sold`
- ver el thumbnail del comprobante (SINPE o captura USDC) y abrirlo a tamaño completo
- confirmar (SOLD) o rechazar (REJECT) una reserva con comprobante
- setear sponsor y URL/data-URL del logo
- resetear una posición

Los comprobantes SINPE se guardan como data URL comprimida (~2 MB) dentro del mismo JSON. En producción ese JSON va cifrado a la rama `catalog`. Neon y Blob reciben una copia solo si responden; un 402 o un 403 no borra la copia de git ni la reemplaza por el seed vacío.

## Copia durable (git)

Cada guardado del admin (incluido un logo) escribe el inventario completo, cifrado, en `data/catalog.json` de la rama **`catalog`**. `/api/positions` lee ese archivo antes que Neon y Blob. Si Neon responde 402 o Blob está suspendido (403), el sitio sigue mostrando los logos de la última copia. Un segundo guardado parte de esa copia: no reemplaza el catálogo por el seed vacío.

La rama `catalog` no redeploya el sitio (`scripts/vercel-ignore.sh`). El plan Hobby alcanza: no hace falta Neon pago ni Vercel Pro.

### Token (una vez)

1. GitHub → Settings → Developer settings → Fine-grained tokens.
2. Acceso solo al repo `Cbiux/Cbiux-Suitecase`. Permiso **Contents: Read and write**.
3. En Vercel, Production (y Preview si lo usás): `CATALOG_GITHUB_TOKEN` = ese token.
4. Redeploy. En `/admin`, si el token falta, aparece el aviso y el guardado responde `NEED_CATALOG_TOKEN`.

El archivo es público pero está cifrado con `CATALOG_SECRET` o, si no la definís, con `ADMIN_PASSWORD`. No cambies esa clave si querés seguir leyendo copias viejas.

### Restaurar la última copia buena

El sitio ya sirve la punta de `catalog`. Para volver a un guardado anterior:

```bash
git fetch origin catalog
git log --oneline origin/catalog -- data/catalog.json
git checkout -B catalog origin/catalog
git show COMMIT:data/catalog.json > data/catalog.json
git add -f data/catalog.json
git commit -m "Restore sponsor catalog backup"
git push origin catalog
```

Para ver nombres y si cada spot tiene logo, sin imprimir el base64:

```bash
git show origin/catalog:data/catalog.json > /tmp/catalog.json
CATALOG_SECRET='la misma clave' npx tsx scripts/restore-catalog.ts /tmp/catalog.json
```

Eso no toca Neon. Cuando la cuota vuelva, el botón **Restaurar Neon** del admin sigue pudiendo leer la base; no pisa una copia con logos con un seed vacío.

## Precios

Ver `lib/positions.ts` y `data/positions.seed.json`.

- 01 presenting: **$280**
- 02–05 frente premium: **$120–$150**
- 19–20 frente franja baja: **$105–$110**
- 06 headline reverso: **$200**
- 07–10 mid: **$75–$95**
- 21–22 reverso franja baja: **$60–$70**
- 11–18 costados: **$45–$65**
- Badge: **from $45**

Extras: merch medio día $80 / día $150 · backpack/plush $250 · video dedicado se cotiza aparte.

## Oferta libre

Después del picker (`#offer`) hay un formulario bilingüe para que una marca proponga su propio deal (monto o paquete custom). Valida campos, guarda un registro ligero en `POST /api/offer` y abre `mailto:` a Sebastián con el cuerpo prefabricado. No cobra ni pide SINPE/crypto.

## Assets

- `/public/suitcase-front.png` — frente (el reverso / atrás lo espeja el CSS)
- `/public/suitcase-side.png` — perfil (lado y contrario)
- `/public/photo.jpg` — still del vlog diario
- `/public/og.png` — preview del link (OG) 1200×630
- `/public/promo.png` — imagen cuadrada para postear (también en `/promo`)

## Contacto

- X: [@Cbiux_04](https://x.com/Cbiux_04)
- LinkedIn: [/in/cbiux](https://www.linkedin.com/in/cbiux)
- Email: jsebascp04@gmail.com
- Telegram: [@cbiux](https://t.me/cbiux)
