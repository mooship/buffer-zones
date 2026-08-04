import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

const TRANSIT_GEOMETRY_SELECTOR =
  ".leaflet-transit-pane canvas, .leaflet-transit-pane path";

async function transitCanvasHasPaint(page: {
  evaluate: (fn: () => boolean) => Promise<boolean>;
}) {
  return page.evaluate(() => {
    const canvas = document.querySelector(
      ".leaflet-transit-pane canvas",
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      return false;
    }
    const context = canvas.getContext("2d");
    if (!context || canvas.width === 0 || canvas.height === 0) {
      return false;
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const alphaChannelOffset = 3;
    const bytesPerPixel = 4;
    for (
      let index = alphaChannelOffset;
      index < imageData.data.length;
      index += bytesPerPixel
    ) {
      if (imageData.data[index] !== 0) {
        return true;
      }
    }
    return false;
  });
}

test.describe("layer toggles", () => {
  test("toggling a transit layer on adds it to the map, and off removes it", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);

    const rapidRailCheckbox = page.getByTestId(E2E.layerToggle.rapidRail);
    await expect(rapidRailCheckbox).not.toBeChecked();

    const paneBefore = page.locator(TRANSIT_GEOMETRY_SELECTOR);
    await expect(paneBefore).toHaveCount(0);

    await rapidRailCheckbox.check();
    await expect(rapidRailCheckbox).toBeChecked();
    await expect
      .poll(async () => {
        const svgPathCount = await page
          .locator(".leaflet-transit-pane path")
          .count();
        if (svgPathCount > 0) {
          return true;
        }
        return transitCanvasHasPaint(page);
      })
      .toBe(true);

    await rapidRailCheckbox.uncheck();
    await expect(rapidRailCheckbox).not.toBeChecked();
    await expect
      .poll(async () => {
        const svgPathCount = await page
          .locator(".leaflet-transit-pane path")
          .count();
        if (svgPathCount > 0) {
          return true;
        }
        return transitCanvasHasPaint(page);
      })
      .toBe(false);
  });

  test("keeps only one accessibility overlay active at a time", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);

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
