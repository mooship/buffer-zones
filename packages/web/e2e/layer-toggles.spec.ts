import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

test.describe("layer toggles", () => {
  test("toggling a transit layer on adds it to the map, and off removes it", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);
    await page.getByTestId(E2E.panelTab.layers).click();

    const rapidRailCheckbox = page.getByTestId(E2E.layerToggle.rapidRail);
    await expect(rapidRailCheckbox).not.toBeChecked();

    const paneBefore = page.locator(".leaflet-transit-pane path");
    await expect(paneBefore).toHaveCount(0);

    await rapidRailCheckbox.check();
    await expect(rapidRailCheckbox).toBeChecked();
    await expect(
      page.locator(".leaflet-transit-pane path").first(),
    ).toBeVisible();

    await rapidRailCheckbox.uncheck();
    await expect(rapidRailCheckbox).not.toBeChecked();
    await expect(page.locator(".leaflet-transit-pane path")).toHaveCount(0);
  });

  test("keeps only one accessibility overlay active at a time", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);
    await page.getByTestId(E2E.panelTab.layers).click();

    const modeledCarTimeCheckbox = page.getByTestId(E2E.layerToggle.townships);
    const nearestTransitCheckbox = page.getByTestId(
      E2E.layerToggle.nearestTransit,
    );

    await expect(modeledCarTimeCheckbox).toBeChecked();
    await expect(nearestTransitCheckbox).not.toBeChecked();

    await nearestTransitCheckbox.check();
    await expect(nearestTransitCheckbox).toBeChecked();
    await expect(modeledCarTimeCheckbox).not.toBeChecked();

    await modeledCarTimeCheckbox.check();
    await expect(modeledCarTimeCheckbox).toBeChecked();
    await expect(nearestTransitCheckbox).not.toBeChecked();
  });
});
