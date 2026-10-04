export type GeocodeHit = {
  name: string;
  region: string;
  lat: number;
  lng: number;
};

export async function searchCities(query: string): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("GEOCODE_FAILED");
  const body = (await response.json()) as {
    results?: Array<{
      name?: string;
      latitude?: number;
      longitude?: number;
      country?: string;
      admin1?: string;
    }>;
  };
  return (body.results ?? [])
    .filter(
      (item) =>
        Boolean(item.name?.trim()) &&
        Number.isFinite(Number(item.latitude)) &&
        Number.isFinite(Number(item.longitude)),
    )
    .map((item) => ({
      name: String(item.name).trim(),
      region: [item.admin1, item.country].filter(Boolean).join(", "),
      lat: Number(item.latitude),
      lng: Number(item.longitude),
    }));
}
