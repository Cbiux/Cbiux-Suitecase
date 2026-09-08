import { ogAlt, ogSize, renderOgImage } from "@/lib/social-image";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage();
}
