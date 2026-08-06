import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

test.describe("map feature keyboard accessibility", () => {
  test("the selectable-feature search is focusable, hidden until focused, and shows a visible focus ring", async ({
    page,
  }) => {
    await page.goto("/");

    const searchInput = page.getByTestId(E2E.selectableFeatureSearchInput);

    await expect(searchInput).not.toBeInViewport();

    await searchInput.focus();

    await expect(searchInput).toBeInViewport();
    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveCSS("outline-style", "solid");
  });

  test("searching by name and choosing a result opens that feature's popup", async ({
    page,
  }) => {
    await page.goto("/");

    const searchInput = page.getByTestId(E2E.selectableFeatureSearchInput);
    await searchInput.focus();
    await searchInput.fill("Botshabelo");

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page.getByTestId(E2E.townshipPopup)).toBeVisible();
  });
});
