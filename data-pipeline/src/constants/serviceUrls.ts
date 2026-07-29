// Base URLs for the two external services this pipeline depends on. Both
// default to the public demo/community instances used in development, but
// can be pointed at a locally self-hosted instance (see data-pipeline's
// docker-compose.yml and README "Running locally without rate limits"
// section) by setting the corresponding environment variable before running
// `npm run run`. This is the only thing that needs to change to run the
// whole pipeline against local infrastructure — no other pipeline code
// depends on which instance is used.
export function getOsrmBaseUrl(): string {
  return process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
}

// Public Overpass mirrors tried in turn on failure (in addition to the
// built-in retry-with-backoff for a single mirror), since overpass-api.de
// alone rate-limits (429) or times out (504) under sustained pipeline use.
// If OVERPASS_URL is set (e.g. to a local instance), only that URL is used.
const PUBLIC_OVERPASS_MIRRORS: readonly string[] = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export function getOverpassUrls(): readonly string[] {
  const override = process.env.OVERPASS_URL;
  return override ? [override] : PUBLIC_OVERPASS_MIRRORS;
}
