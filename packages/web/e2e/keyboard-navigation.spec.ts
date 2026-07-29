import { expect, test } from "./fixtures";

test.describe("keyboard navigation", () => {
  test("supports arrow-key, Home, and End navigation between panel tabs", async ({
    page,
  }) => {
    await page.goto("/");

    const storyTab = page.getByRole("tab", { name: "The pattern" });
    const placesTab = page.getByRole("tab", { name: "Browse places" });
    const layersTab = page.getByRole("tab", { name: "Map layers" });

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
