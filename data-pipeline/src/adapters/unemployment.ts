// No scriptable Tshwane ward-level unemployment source exists (QLFS is
// provincial/metro PDF-only, Stats SA's ward products are demographic, and
// Tshwane's ArcGIS server has no socio-economic layer) — this URL 200s with
// an Incapsula bot-challenge page, which correctly falls through to null.
const UNEMPLOYMENT_SOURCE_URL =
  "https://www.statssa.gov.za/publications/P0211/Tshwane_ward_unemployment.json";

export async function fetchUnemploymentData(): Promise<Map<
  string,
  number
> | null> {
  try {
    const response = await fetch(UNEMPLOYMENT_SOURCE_URL);
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as Record<string, number>;
    return new Map(Object.entries(body));
  } catch {
    return null;
  }
}
