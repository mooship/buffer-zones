/**
 * The OSRM routing server base URL.
 * @remarks Overridable via `OSRM_BASE_URL` to point at a self-hosted
 *   instance instead of the public default (see `docker-compose.yml`).
 */
export function getOsrmBaseUrl(): string {
  return process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
}

// overpass-api.de alone rate-limits/times out under sustained use, so these
// mirrors are tried in turn on failure. OVERPASS_URL overrides to one URL,
// and OVERPASS_URLS can provide a comma-separated priority list.
const PUBLIC_OVERPASS_MIRRORS: readonly string[] = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

/**
 * Overpass API endpoints to try in turn (`fetchOverpass` rotates through
 * these on repeated 429/504 responses, since a single public instance can be
 * temporarily rate-limited while others aren't).
 * @remarks `OVERPASS_URL` overrides to a single URL; `OVERPASS_URLS`
 *   overrides to a comma-separated priority list. Defaults to
 *   `PUBLIC_OVERPASS_MIRRORS` when neither is set.
 */
export function getOverpassUrls(): readonly string[] {
  const listOverride = process.env.OVERPASS_URLS;
  if (listOverride) {
    const urls = listOverride
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (urls.length > 0) {
      return urls;
    }
  }

  const override = process.env.OVERPASS_URL;
  return override ? [override] : PUBLIC_OVERPASS_MIRRORS;
}
