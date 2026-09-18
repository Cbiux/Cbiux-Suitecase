import { SITE } from "./config";
import { thanksBrand } from "./poster-kit";
import { getCatalogById, padSpot } from "./positions";
import type { Face } from "./types";

const FACE_ES: Record<Face, string> = {
  front: "frente",
  back: "atrás",
  left: "lado contrario",
  right: "lado",
};

export function thanksEmailCopy(sponsor: string, positionId: number) {
  const brand = thanksBrand(sponsor, "");
  const spot = padSpot(positionId);
  const catalog = getCatalogById(positionId);
  const face = catalog ? FACE_ES[catalog.face] : "la maleta";
  const size = catalog?.size ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://cbiux-suitcase.vercel.app";
  const placement = size ? `posición ${spot} · ${face} · ${size}` : `posición ${spot} · ${face}`;
  const subject = `Gracias · posición ${spot} en la maleta de Cbiux`;
  const text = `Hola ${brand},

Gracias por viajar conmigo.

Tu logo va en la ${placement} de mi maleta de cabina, de Costa Rica a Compile Amsterdam, Europa y Devcon India.

Te adjunto las dos imágenes de agradecimiento:
1. El post de gracias con tu logo
2. La vista de la maleta con el espacio que compraste

Podés bajarlas y subirlas a Instagram u otras redes. El vlog diario cubre todo el trip.

${site}

— ${SITE.creator}
@${SITE.x}`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f7f7f4;color:#0b1b4a;font-family:Inter,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe3ee;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#2c3fd1;height:10px;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#2c3fd1;font-weight:700;">
                cbiux · maleta de cabina
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;font-size:28px;line-height:1.2;font-weight:800;color:#0b1b4a;">
                Gracias, ${escapeHtml(brand)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;font-size:16px;line-height:1.55;color:#5c6478;">
                Tu logo viaja en la <strong style="color:#0b1b4a;">${escapeHtml(placement)}</strong> de mi maleta de cabina, de Costa Rica a Compile Amsterdam, Europa y Devcon India.
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;font-size:15px;line-height:1.55;color:#0b1b4a;">
                Te mando las dos imágenes de agradecimiento para Instagram: el post de gracias con tu logo, y la vista de la maleta con el espacio que compraste. El vlog diario cubre todo el trip.
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;">
                <img src="cid:cbiux-thanks" alt="Agradecimiento, posición ${spot}" width="504" style="display:block;width:100%;max-width:504px;border-radius:18px;border:1px solid #dfe3ee;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <img src="cid:cbiux-spot" alt="Espacio ${spot} en la maleta" width="504" style="display:block;width:100%;max-width:504px;border-radius:18px;border:1px solid #dfe3ee;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-size:14px;line-height:1.5;color:#5c6478;">
                <a href="${escapeHtml(site)}" style="color:#2c3fd1;">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a><br /><br />
                — ${escapeHtml(SITE.creator)}<br />
                @${escapeHtml(SITE.x)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { brand, spot, face, size, placement, subject, text, html, site };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
