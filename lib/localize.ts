import { t } from "./i18n";
import type { LivePosition, Locale } from "./types";

export function localizePosition(position: LivePosition, locale: Locale): LivePosition {
  const copy = t(locale).positions[position.id];
  return {
    ...position,
    name: copy.name,
    description: copy.description,
    benefits: [...copy.benefits],
    logoGuidance: copy.logoGuidance,
  };
}

export function localizeInventory<T extends { positions: LivePosition[] }>(
  data: T,
  locale: Locale,
): T {
  return {
    ...data,
    positions: data.positions.map((position) => localizePosition(position, locale)),
  };
}
