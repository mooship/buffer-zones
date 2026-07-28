// Attempts a real Stats SA ward-level Tshwane unemployment download. If no
// usable public source is found, returns null so the pipeline exports an
// explicit "not yet available" empty layer rather than fabricated numbers
// (design doc §4, §8).
//
// Research (2026-07-28): no scriptable, directly-fetchable machine-readable
// source for Tshwane ward-level unemployment was found. Findings:
// - Stats SA's Quarterly Labour Force Survey (QLFS) — the actual unemployment
//   series — is published only at provincial/metro level (PDF reports at
//   statssa.gov.za/publications/P0211/) plus restricted unit-record
//   microdata (via DataFirst/World Bank Microdata catalogs), with no ward
//   breakdown and no public download API.
// - Ward-level indicators that Stats SA does publish (e.g. Small Area
//   Population Estimates) are population/demographic, not unemployment, and
//   are only accessible interactively through SuperWEB2/Nesstar (browser-only
//   query tool, no stable JSON/CSV endpoint suitable for a script).
// - City of Tshwane's e-GIS ArcGIS Server (used successfully for transit
//   layers in gautrain.ts/aReYeng.ts) was probed directly: its service
//   directory (e-gis001.tshwane.gov.za/server/rest/services?f=json) lists
//   only BaseMaps, Hosted, Housing, Imagery, Locators, Network, Other_WS,
//   Print, Printing, Utilities, Viewer, WebApps, WebApps_Pro folders, none
//   socio-economic; the Hosted folder contains only a basemap vector tile
//   service. No unemployment/socio-economic layer is exposed there.
// - The placeholder URL below was probed directly on 2026-07-28: it returns
//   HTTP 200 but with an HTML bot-challenge page (Incapsula WAF), not JSON,
//   so it is not a working endpoint today. It is kept as a placeholder for
//   a hypothetical future direct JSON export; the `response.json()` parse
//   of that HTML throws and is caught below, correctly falling through to
//   null, which is the intended and acceptable outcome per the "never
//   fabricate numbers" constraint.
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
