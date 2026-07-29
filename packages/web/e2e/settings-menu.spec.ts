import { expect, test } from "./fixtures";

test.describe("settings menu", () => {
  test("switches the theme preference and reflects it on the document", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Map settings" }).click();

    await expect(page.locator("html")).not.toHaveAttribute("data-theme");

    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("switching to the dark theme also darkens the street map tiles", async ({
    page,
  }) => {
    await page.goto("/");
    const tileLayerContainer = page.locator(
      ".leaflet-tile-pane .leaflet-layer",
    );
    await expect(page.locator(".leaflet-tile-pane img").first()).toBeVisible();
    await expect(tileLayerContainer).not.toHaveClass(/darkTile/);

    await page.getByRole("button", { name: "Map settings" }).click();
    await page.getByRole("button", { name: "Dark theme" }).click();

    await expect(tileLayerContainer).toHaveClass(/darkTile/);
    await expect(
      page.locator(".leaflet-tile-pane img").first(),
    ).toHaveAttribute("src", /cartocdn\.com\/dark_all/);
  });

  test("switches the basemap and requests different tiles", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".leaflet-tile-pane img").first()).toBeVisible();

    await page.getByRole("button", { name: "Map settings" }).click();
    await page.getByRole("button", { name: "Satellite basemap" }).click();

    await expect(
      page.locator(".leaflet-tile-pane img").first(),
    ).toHaveAttribute("src", /arcgisonline\.com/);
  });
});
