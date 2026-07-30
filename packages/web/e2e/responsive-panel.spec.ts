import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

test.describe("responsive panel", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("defaults the controls panel closed on a mobile viewport, and Explore opens it", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByTestId(E2E.panelToggle);
    const tablist = page.getByTestId(E2E.panelTablist);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(tablist).toBeHidden();

    await trigger.click();

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(tablist).toBeVisible();
  });

  test("provides one-tap map legend access on mobile without opening Explore", async ({
    page,
  }) => {
    await page.goto("/");

    const panelToggle = page.getByTestId(E2E.panelToggle);
    await expect(panelToggle).toHaveAttribute("aria-expanded", "false");

    const legendTrigger = page.getByTestId(E2E.mobileLegendTrigger);
    await expect(legendTrigger).toBeVisible();
    await expect(legendTrigger).toHaveAttribute("aria-expanded", "false");

    await legendTrigger.click();

    await expect(legendTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId(E2E.mobileLegendContent)).toBeVisible();

    await page.getByTestId(E2E.mobileLegendClose).click();
    await expect(page.getByTestId(E2E.mobileLegendContent)).toBeHidden();
    await expect(legendTrigger).toHaveAttribute("aria-expanded", "false");
  });

  test("lets mobile users expand and reduce the Explore sheet height", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId(E2E.panelToggle).click();

    const panel = page.getByTestId(E2E.panelContainer);
    const handle = page.getByTestId(E2E.panelSheetHandle);

    await expect(panel).toHaveAttribute("data-panel-size", "medium");
    await expect(handle).toHaveAttribute("aria-pressed", "false");

    await handle.click();

    await expect(panel).toHaveAttribute("data-panel-size", "full");
    await expect(handle).toHaveAttribute("aria-pressed", "true");

    await handle.click();

    await expect(panel).toHaveAttribute("data-panel-size", "medium");
    await expect(handle).toHaveAttribute("aria-pressed", "false");
  });

  test("supports swipe gestures on the mobile sheet handle", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId(E2E.panelToggle).click();

    const panel = page.getByTestId(E2E.panelContainer);
    const handle = page.getByTestId(E2E.panelSheetHandle);
    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      throw new Error("Panel sheet handle was not rendered");
    }
    const dragX = handleBox.x + handleBox.width / 2;

    await page.mouse.move(dragX, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dragX, handleBox.y - 80, { steps: 6 });

    await expect(panel).toHaveAttribute("data-panel-dragging", "true");
    await page.mouse.up();

    await expect(panel).toHaveAttribute("data-panel-size", "full");

    await page.mouse.move(dragX, handleBox.y + handleBox.height / 2 - 80);
    await page.mouse.down();
    await page.mouse.move(dragX, handleBox.y + handleBox.height / 2 + 80, {
      steps: 6,
    });
    await page.mouse.up();

    await expect(panel).toHaveAttribute("data-panel-size", "medium");
    await expect(panel).toHaveAttribute("data-panel-dragging", "false");
    await expect(panel).toHaveAttribute("data-panel-drag-direction", "none");
  });
});
