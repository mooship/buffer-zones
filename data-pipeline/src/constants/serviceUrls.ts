// Overridable via env vars to point at a self-hosted instance instead of the
// public defaults (see docker-compose.yml).
export function getOsrmBaseUrl(): string {
  return process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
}

// overpass-api.de alone rate-limits/times out under sustained use, so these
// mirrors are tried in turn on failure. OVERPASS_URL overrides to one URL.
const PUBLIC_OVERPASS_MIRRORS: readonly string[] = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export function getOverpassUrls(): readonly string[] {
  const override = process.env.OVERPASS_URL;
  return override ? [override] : PUBLIC_OVERPASS_MIRRORS;
}
