import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

test.describe("settings menu", () => {
  test("closes on Escape and outside click", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByTestId(E2E.settingsMenuTrigger);
    await trigger.click();

    const menu = page.getByTestId(E2E.settingsMenuContent);
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(menu).toBeVisible();
    await page.getByTestId(E2E.mapView).click({ position: { x: 8, y: 8 } });
    await expect(menu).not.toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("switches the theme preference and reflects it on the document", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId(E2E.settingsMenuTrigger).click();

    await expect(page.locator("html")).not.toHaveAttribute("data-theme");

    await page.getByTestId(E2E.themeOption.dark).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByTestId(E2E.themeOption.light).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("persists theme preference across reload and clears it in system mode", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId(E2E.settingsMenuTrigger).click();

    await page.getByTestId(E2E.themeOption.dark).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.locator('meta[name="theme-color"][data-theme-override]'),
    ).toHaveAttribute("content", "#23262c");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByTestId(E2E.settingsMenuTrigger).click();
    await page.getByTestId(E2E.themeOption.system).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expect(
      page.locator('meta[name="theme-color"][data-theme-override]'),
    ).toHaveCount(0);

    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
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

    await page.getByTestId(E2E.settingsMenuTrigger).click();
    await page.getByTestId(E2E.themeOption.dark).click();

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

    await page.getByTestId(E2E.settingsMenuTrigger).click();
    await page.getByTestId(E2E.basemapOption.satellite).click();

    await expect(
      page.locator(".leaflet-tile-pane img").first(),
    ).toHaveAttribute("src", /arcgisonline\.com/);
  });
});
