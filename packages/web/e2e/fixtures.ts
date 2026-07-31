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
    await use(page);
  },
});

export { expect };
