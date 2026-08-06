import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { mockFailOnceThenSucceed } from "./ui";

const MAP_GEOMETRY_SELECTOR =
  ".leaflet-overlay-pane canvas, .leaflet-container path.leaflet-interactive";

test.describe("data load error and retry", () => {
  test("shows an error when township data fails to load, and recovers on retry", async ({
    page,
  }) => {
    const requestState = await mockFailOnceThenSucceed(
      page,
      "**/data/**/townships.display.v1.geojson*",
    );

    await page.goto("/");

    const alert = page.getByTestId(E2E.dataLoadError);
    await expect(alert).toBeVisible();

    await page.getByTestId(E2E.retryDataLoad).click();

    await expect(alert).not.toBeVisible();
    await expect(page.locator(MAP_GEOMETRY_SELECTOR).first()).toBeVisible();
    expect(requestState.requestCount).toBe(2);
  });
});
