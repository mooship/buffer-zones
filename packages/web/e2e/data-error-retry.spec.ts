import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

const MAP_GEOMETRY_SELECTOR =
  ".leaflet-overlay-pane canvas, .leaflet-container path.leaflet-interactive";

test.describe("data load error and retry", () => {
  test("shows an error when township data fails to load, and recovers on retry", async ({
    page,
  }) => {
    let requestCount = 0;
    await page.route("**/data/**/townships.display.v1.geojson*", (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        return route.fulfill({ status: 500, body: "Internal Server Error" });
      }
      return route.continue();
    });

    await page.goto("/");

    const alert = page.getByTestId(E2E.dataLoadError);
    await expect(alert).toBeVisible();

    await page.getByTestId(E2E.retryDataLoad).click();

    await expect(alert).not.toBeVisible();
    await expect(page.locator(MAP_GEOMETRY_SELECTOR).first()).toBeVisible();
    expect(requestCount).toBe(2);
  });
});
