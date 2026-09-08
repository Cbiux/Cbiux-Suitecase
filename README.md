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
| `UPSTASH_REDIS_REST_URL` | Redis de inventario (producción) |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash |
| `PAYMENT_VERIFY_MODE` | `stub` (default) o `indexer` |
| `NEXT_PUBLIC_HELIO_PAY_URL` | Paylink de Helio (opcional) |
| `STORE_PATH` | Ruta opcional del JSON de inventario |

Las direcciones públicas de SINPE, EVM y Stellar están hardcodeadas en `lib/config.ts` y se muestran aunque no haya env. Solana no se inventa: solo aparece si seteás la variable.

Si `ADMIN_PASSWORD` no está definida, `/admin` acepta `cbiux-admin-demo` (cambialo en producción).

## Deploy en Vercel

1. Importá el repo en Vercel (framework: Next.js).
2. Cargá las env vars de arriba.
3. Deploy.

El inventario vive en `data/store.json` en local. En Vercel se guarda en **Upstash Redis** si están `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`. Sin Redis, Vercel usa `/tmp` y **un redeploy puede resetear ventas**.

## Cómo se paga y se verifica

El checkout ofrece tres métodos reales:

1. **SINPE Móvil** al `84358038` (colones o USD). El sponsor **tiene que subir una foto o captura del comprobante**. Sin imagen no se acepta. El spot queda `reserved` 48 h. Sebastián revisa el comprobante en `/admin` y lo marca `sold` o lo rechaza.
2. **USDC en EVM / Base** a `0xC38555a1Afcd8394532Caa11D0be60Df166eC188`. Memo `CBIUX-XX`. Pega el hash.
3. **USDC en Stellar** a `GAS52QOWKVBW2WYDRQ3KS4CSJ2QQNALPGURK2HLGJSNE2XUH7BH555BS`. Memo `CBIUX-XX`. Pega el hash.

Flujo:

1. Elegí una posición y dejá el nombre de la marca.
2. El spot queda **reserved**.
3. Pagá por SINPE o USDC e incluí el memo `CBIUX-01` … `CBIUX-22` si el canal lo permite.
4. SINPE: el sponsor sube el comprobante; Sebastián lo verifica en `/admin`. USDC: `/api/verify` valida el formato del hash.
5. Con `PAYMENT_VERIFY_MODE=stub` un hash EVM/Stellar con forma válida marca el spot `sold`. SINPE nunca se auto-vende.
6. Después se sube PNG/WebP para la web. El SVG de impresión va por DM en X (`@Cbiux_04`) o Telegram (`@cbiux`).

Helio sigue siendo opcional (`NEXT_PUBLIC_HELIO_PAY_URL`).

### TODO: indexer real

`lib/payments.ts` tiene el contrato. Antes de confiar en hashes on-chain:

- **EVM / Base:** Alchemy / Basescan, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- **Stellar:** Horizon, destino + memo `CBIUX-XX`.
- Poné `PAYMENT_VERIFY_MODE=indexer` para fallar cerrado hasta que el lookup esté vivo.

## Admin

`/admin` — login con `ADMIN_PASSWORD`. Desde ahí podés:

- marcar un spot `available` / `reserved` / `sold`
- ver el thumbnail del comprobante SINPE y abrirlo a tamaño completo
- confirmar (SOLD) o rechazar (REJECT) una reserva SINPE
- setear sponsor y URL/data-URL del logo
- resetear una posición

Los comprobantes SINPE se guardan como data URL comprimida (~2 MB) dentro del JSON del store. En Vercel ese archivo vive en `/tmp` y **es efímero**: un redeploy puede borrar capturas. Bajá el comprobante desde `/admin` cuando entre una reserva. Para producción real, mové el store a KV / Postgres.

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
