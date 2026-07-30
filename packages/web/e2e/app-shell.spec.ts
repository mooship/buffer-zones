import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

test.describe("app shell", () => {
  test("loads with the expected landmarks and a rendered map", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/buffer zones/i);
    await expect(
      page.getByRole("link", { name: /skip to map information/i }),
    ).toHaveAttribute("href", "#map-information");
    await expect(page.getByRole("main")).toHaveAttribute(
      "id",
      "map-information",
    );
    await expect(
      page.getByRole("heading", { name: "Buffer Zones", level: 1 }),
    ).toBeVisible();

    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(
      page.locator(".leaflet-container path.leaflet-interactive").first(),
    ).toBeVisible();
  });

  test("shows the map legend and layer controls by default via the layers tab", async ({
    page,
  }) => {
    await page.goto("/");

    await ensurePanelOpen(page);

    await page.getByTestId(E2E.panelTab.layers).click();

    await expect(page.getByTestId(E2E.layerToggle.townships)).toBeChecked();
    await expect(page.getByTestId(E2E.panelLegend)).toBeVisible();
  });
});
