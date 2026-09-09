import type { LivePosition } from "./types";

export function withBrand(template: string, brand: string) {
  return template.replace("{brand}", brand.trim());
}

export function fillCopy(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export function spotOwnerLabel(
  spot: Pick<LivePosition, "status" | "sponsor">,
  dict: {
    pick: {
      sold: string;
      held: string;
      boughtBy: string;
      reservedBy: string;
    };
  },
) {
  const brand = spot.sponsor.trim();
  if (spot.status === "sold") {
    return brand ? withBrand(dict.pick.boughtBy, brand) : dict.pick.sold;
  }
  if (spot.status === "reserved") {
    return brand ? withBrand(dict.pick.reservedBy, brand) : dict.pick.held;
  }
  return "";
}
