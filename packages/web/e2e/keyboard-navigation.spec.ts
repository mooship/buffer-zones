import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

test.describe("keyboard navigation", () => {
  test("supports arrow-key, Home, and End navigation between panel tabs", async ({
    page,
  }) => {
    await page.goto("/");

    await ensurePanelOpen(page);

    const layersTab = page.getByTestId(E2E.panelTab.layers);
    const askTab = page.getByTestId(E2E.panelTab.ask);

    await layersTab.focus();
    await expect(layersTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowRight");
    await expect(askTab).toHaveAttribute("aria-selected", "true");
    await expect(askTab).toBeFocused();

    await page.keyboard.press("End");
    await expect(askTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Home");
    await expect(layersTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(askTab).toHaveAttribute("aria-selected", "true");
  });
});
