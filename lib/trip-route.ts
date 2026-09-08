export const PLACE_IDS = [
  "sjo",
  "ams",
  "ber",
  "bru",
  "mad",
  "par",
  "rom",
  "lis",
  "dxb",
  "bom",
] as const;

export type PlaceId = (typeof PLACE_IDS)[number];

export const PLACES: Record<PlaceId, { lat: number; lng: number }> = {
  sjo: { lat: 9.9281, lng: -84.0907 },
  ams: { lat: 52.3676, lng: 4.9041 },
  ber: { lat: 52.52, lng: 13.405 },
  bru: { lat: 50.8503, lng: 4.3517 },
  mad: { lat: 40.4168, lng: -3.7038 },
  par: { lat: 48.8566, lng: 2.3522 },
  rom: { lat: 41.9028, lng: 12.4964 },
  lis: { lat: 38.7223, lng: -9.1393 },
  dxb: { lat: 25.2048, lng: 55.2708 },
  bom: { lat: 19.076, lng: 72.8777 },
};

/** Ida hasta Mumbai, luego el regreso. Dubái y Madrid se repiten a propósito. */
export const ROUTE_VISITS: PlaceId[] = [
  "sjo",
  "ams",
  "ber",
  "bru",
  "mad",
  "par",
  "rom",
  "lis",
  "dxb",
  "bom",
  "dxb",
  "mad",
  "sjo",
];

export const OUTBOUND_HOPS = 9;

export type RoutePoint = {
  id: PlaceId;
  lat: number;
  lng: number;
};

export type RouteArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  outbound: boolean;
  index: number;
};

export const ROUTE_POINTS: RoutePoint[] = PLACE_IDS.map((id) => ({
  id,
  ...PLACES[id],
}));

export const ROUTE_ARCS: RouteArc[] = ROUTE_VISITS.slice(0, -1).map((from, index) => {
  const to = ROUTE_VISITS[index + 1];
  return {
    startLat: PLACES[from].lat,
    startLng: PLACES[from].lng,
    endLat: PLACES[to].lat,
    endLng: PLACES[to].lng,
    outbound: index < OUTBOUND_HOPS,
    index,
  };
});

export function padStop(index: number) {
  return String(index + 1).padStart(2, "0");
}
