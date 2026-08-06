import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

const SOWETO_RESULT = {
  place_id: 26262288,
  display_name: "Soweto, City of Johannesburg, Gauteng, South Africa",
  lat: "-26.2678",
  lon: "27.8586",
  boundingbox: ["-26.35", "-26.20", "27.75", "27.95"],
};

/**
 * Serves a fixed Nominatim payload so the suite doesn't depend on
 * OpenStreetMap's geocoder being reachable or within its rate limit.
 */
async function mockGeocoder(page: Page) {
  await page.route(/nominatim\.openstreetmap\.org\/search/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([SOWETO_RESULT]),
    }),
  );
}

/**
 * Waits for the map's keyboard-only feature-search entry point to mount, which
 * only happens once the township choropleth data has loaded. That component
 * shares the location search's top-left corner, so a test that interacts with
 * the location search before it mounts can't see it shadowing the input.
 */
async function waitForSelectableFeatureSearch(page: Page) {
  await expect(page.getByTestId(E2E.selectableFeatureSearch)).toBeAttached({
    timeout: 30_000,
  });
}

test.describe("location search", () => {
  test("stays clickable once the map's feature-search overlay has mounted", async ({
    page,
  }) => {
    await mockGeocoder(page);
    await page.goto("/");
    await waitForSelectableFeatureSearch(page);

    const input = page.getByTestId(E2E.locationSearchInput);
    await expect(input).toBeVisible();
    await input.click();

    await expect(input).toBeFocused();
  });

  test("searches for a place and flies the map to the picked result", async ({
    page,
  }) => {
    await mockGeocoder(page);
    await page.goto("/");
    await waitForSelectableFeatureSearch(page);

    const input = page.getByTestId(E2E.locationSearchInput);
    await input.click();
    await input.fill("soweto");

    const results = page.getByTestId(E2E.locationSearchResults);
    await expect(results).toBeVisible();

    const firstResult = results.getByRole("option").first();
    await expect(firstResult).toHaveText(SOWETO_RESULT.display_name);
    await firstResult.click();

    await expect(input).toHaveValue(SOWETO_RESULT.display_name);
    await expect(results).toBeHidden();
    await expect(page.getByTestId("location-out-of-coverage")).toHaveCount(0);
  });

  test("still lets the revealed feature search be used once focused", async ({
    page,
  }) => {
    await mockGeocoder(page);
    await page.goto("/");
    await waitForSelectableFeatureSearch(page);

    const featureSearchInput = page.getByTestId(
      E2E.selectableFeatureSearchInput,
    );
    await featureSearchInput.focus();
    await featureSearchInput.fill("Mabopane");

    const featureResults = page.getByTestId(E2E.selectableFeatureSearchResults);
    await expect(featureResults).toBeVisible();

    const firstFeature = featureResults.getByRole("option").first();
    const featureLabel = await firstFeature.innerText();
    await firstFeature.click();

    await expect(
      page.getByTestId(E2E.selectableFeatureSearch).getByRole("status"),
    ).toHaveText(`${featureLabel} selected`);
  });
});
