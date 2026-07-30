import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

test.describe("keyboard navigation", () => {
  test("supports arrow-key, Home, and End navigation between panel tabs", async ({
    page,
  }) => {
    await page.goto("/");

    await ensurePanelOpen(page);

    const storyTab = page.getByTestId(E2E.panelTab.story);
    const placesTab = page.getByTestId(E2E.panelTab.places);
    const layersTab = page.getByTestId(E2E.panelTab.layers);

    await storyTab.focus();
    await expect(storyTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowRight");
    await expect(placesTab).toHaveAttribute("aria-selected", "true");
    await expect(placesTab).toBeFocused();

    await page.keyboard.press("End");
    await expect(layersTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Home");
    await expect(storyTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(layersTab).toHaveAttribute("aria-selected", "true");
  });
});
