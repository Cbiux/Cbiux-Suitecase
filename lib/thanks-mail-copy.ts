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
  const subject = `Gracias de verdad · ${brand}`;
  const text = `Hola ${brand},

De verdad aprecio mucho que me apoyara.

Significa muchísimo para mí que haya tomado la decisión de querer apoyarme, incluso sabiendo que no iba a llevar tantas cosas a su empresa. Confiar en mí así no es poca cosa, y lo valoro de corazón.

Siento que de aquí en adelante podemos hacer muchísimas cosas juntos. Su patrocinio está en buenas manos: lo voy a aprovechar para hacer un viaje de bien, y documentarlo día a día.

Su logo va en la ${placement} de mi maleta de cabina, de Costa Rica a Compile Amsterdam, Europa y Devcon India.

Le adjunto las dos imágenes de agradecimiento:
1. El post de gracias con su logo
2. La vista de la maleta con el espacio que compró

Puede usarlas en Instagram u otras redes.

Muchas bendiciones para usted y para todo el equipo. Estoy muy agradecido con ustedes.

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
                un agradecimiento personal
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;font-size:28px;line-height:1.2;font-weight:800;color:#0b1b4a;">
                Gracias de verdad, ${escapeHtml(brand)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 12px;font-size:16px;line-height:1.6;color:#0b1b4a;">
                De verdad aprecio mucho que me apoyara.
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 12px;font-size:16px;line-height:1.6;color:#0b1b4a;">
                Significa muchísimo para mí que haya tomado la decisión de querer apoyarme, incluso sabiendo que no iba a llevar tantas cosas a su empresa. Confiar en mí así no es poca cosa, y lo valoro de corazón.
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 12px;font-size:16px;line-height:1.6;color:#0b1b4a;">
                Siento que de aquí en adelante podemos hacer muchísimas cosas juntos. Su patrocinio está en buenas manos: lo voy a aprovechar para hacer un viaje de bien, y documentarlo día a día.
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;font-size:15px;line-height:1.6;color:#5c6478;">
                Su logo va en la <strong style="color:#0b1b4a;">${escapeHtml(placement)}</strong> de mi maleta de cabina, de Costa Rica a Compile Amsterdam, Europa y Devcon India.
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
              <td style="padding:0 28px 8px;font-size:15px;line-height:1.6;color:#0b1b4a;">
                Le mando las dos imágenes de agradecimiento para que las use en Instagram u otras redes: el post de gracias con su logo, y la vista de la maleta con el espacio que compró.
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-size:16px;line-height:1.6;color:#0b1b4a;">
                Muchas bendiciones para usted y para todo el equipo. Estoy muy agradecido con ustedes.<br /><br />
                <a href="${escapeHtml(site)}" style="color:#2c3fd1;font-size:14px;">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a><br /><br />
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
