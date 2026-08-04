import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

const SELECTABLE_FEATURE_SELECTOR = "path.leaflet-interactive[role='button']";

test.describe("map feature keyboard accessibility", () => {
  test("selectable choropleth features are keyboard-focusable with a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/");

    const feature = page.locator(SELECTABLE_FEATURE_SELECTOR).first();
    await expect(feature).toBeVisible();
    await expect(feature).toHaveAttribute("tabindex", "0");

    await feature.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");

    await expect(feature).toBeFocused();
    await expect(feature).toHaveCSS("outline-style", "solid");
  });

  test("opens a feature's popup via Enter and Space", async ({ page }) => {
    await page.goto("/");

    const feature = page.locator(SELECTABLE_FEATURE_SELECTOR).first();
    await feature.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press("Enter");

    await expect(page.getByTestId(E2E.townshipPopup)).toBeVisible();

    await page.keyboard.press("Escape");
    await feature.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press(" ");

    await expect(page.getByTestId(E2E.townshipPopup)).toBeVisible();
  });
});
