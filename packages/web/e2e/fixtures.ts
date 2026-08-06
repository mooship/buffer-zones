import { test as base, expect } from "@playwright/test";

// A 1x1 transparent PNG, served in place of real basemap tile requests so
// the suite doesn't depend on OpenStreetMap/CARTO/Esri network availability
// or rate limits.
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const TILE_HOST_PATTERN =
  /tile\.openstreetmap\.org|basemaps\.cartocdn\.com|server\.arcgisonline\.com/;

/** Matches a Nominatim place-search request, for tests that override the default geocoder stub below. */
export const GEOCODER_SEARCH_PATTERN = /nominatim\.openstreetmap\.org\/search/;

/**
 * The single place hit that every location search in the suite resolves to,
 * served in place of real Nominatim requests for the same reason the tile
 * stub above exists: OpenStreetMap's geocoder is a third party with a
 * one-request-per-second rate limit.
 * @remarks Inside `SEARCH_COVERAGE_BOUNDS` (see `App.tsx`), so picking it
 *   moves the map rather than reporting an out-of-coverage result.
 */
export const GEOCODER_RESULT = {
  place_id: 26262288,
  display_name: "Soweto, City of Johannesburg, Gauteng, South Africa",
  lat: "-26.2678",
  lon: "27.8586",
  boundingbox: ["-26.35", "-26.20", "27.75", "27.95"],
};

export const test = base.extend({
  baseURL: [
    process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173",
    { option: true },
  ],
  page: async ({ page }, use) => {
    await page.route(TILE_HOST_PATTERN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TRANSPARENT_PNG,
      }),
    );
    await page.route(GEOCODER_SEARCH_PATTERN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([GEOCODER_RESULT]),
      }),
    );
    await use(page);
  },
});

export { expect };
