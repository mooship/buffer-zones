import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

const THEME_STORAGE_KEY = "buffer-zones-theme";

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
    await expect
      .poll(async () =>
        page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY),
      )
      .toBe("dark");
    await expect(
      page.locator('meta[name="theme-color"][data-theme-override]'),
    ).toHaveAttribute("content", "#23262c");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByTestId(E2E.settingsMenuTrigger).click();
    await page.getByTestId(E2E.themeOption.system).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expect
      .poll(async () =>
        page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY),
      )
      .toBeNull();
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
    await expect(page.locator(".leaflet-tile-pane img").first()).toBeVisible();
    await expect(
      page.locator(".leaflet-tile-pane img").first(),
    ).toHaveAttribute("src", /cartocdn\.com\/light_all/);

    await page.getByTestId(E2E.settingsMenuTrigger).click();
    await page.getByTestId(E2E.themeOption.dark).click();

    await expect(
      page.locator(".leaflet-tile-pane img").first(),
    ).toHaveAttribute("src", /cartocdn\.com\/dark_all/);
  });

  for (const [label, basemap, urlPattern] of [
    ["satellite", E2E.basemapOption.satellite, /arcgisonline\.com/],
    ["topo", E2E.basemapOption.topo, /World_Topo_Map/],
  ] as const) {
    test(`switches to the ${label} basemap and requests different tiles`, async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.locator(".leaflet-tile-pane img").first(),
      ).toBeVisible();

      await page.getByTestId(E2E.settingsMenuTrigger).click();
      await page.getByTestId(basemap).click();

      await expect(
        page.locator(".leaflet-tile-pane img").first(),
      ).toHaveAttribute("src", urlPattern);
    });
  }
});
