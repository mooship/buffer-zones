import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

test.describe("panel story tab", () => {
  test("defaults to the Layers tab and switches to Story by pointer", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);

    const layersTab = page.getByTestId(E2E.panelTab.layers);
    const storyTab = page.getByTestId(E2E.panelTab.story);

    await expect(layersTab).toHaveAttribute("aria-selected", "true");
    await expect(storyTab).toHaveAttribute("aria-selected", "false");
    await expect(page.getByTestId(E2E.layerToggle.townships)).toBeVisible();

    await storyTab.click();

    await expect(storyTab).toHaveAttribute("aria-selected", "true");
    await expect(layersTab).toHaveAttribute("aria-selected", "false");
    await expect(
      page.getByRole("heading", { name: "Why this map exists" }),
    ).toBeVisible();
    await expect(page.getByTestId(E2E.layerToggle.townships)).toBeHidden();
  });

  test("moves selection and focus between tabs with the arrow keys", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);

    const layersTab = page.getByTestId(E2E.panelTab.layers);
    const storyTab = page.getByTestId(E2E.panelTab.story);

    await layersTab.focus();
    await page.keyboard.press("ArrowRight");

    await expect(storyTab).toBeFocused();
    await expect(storyTab).toHaveAttribute("aria-selected", "true");
    await expect(layersTab).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("ArrowLeft");

    await expect(layersTab).toBeFocused();
    await expect(layersTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("End");

    await expect(storyTab).toBeFocused();
    await expect(storyTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Home");

    await expect(layersTab).toBeFocused();
    await expect(layersTab).toHaveAttribute("aria-selected", "true");
  });
});
