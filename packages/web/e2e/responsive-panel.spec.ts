import { expect, test } from "./fixtures";
import { E2E } from "./selectors";

test.describe("responsive panel", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("keeps the settings button clear of the distance scale on mobile", async ({
    page,
  }) => {
    await page.goto("/");

    const settingsTrigger = page.getByTestId(E2E.settingsMenuTrigger);
    const scale = page.locator(".leaflet-control-scale");

    await expect(settingsTrigger).toBeVisible();
    await expect(scale).toBeVisible();

    const settingsBox = await settingsTrigger.boundingBox();
    const scaleBox = await scale.boundingBox();

    expect(settingsBox).not.toBeNull();
    expect(scaleBox).not.toBeNull();

    if (!settingsBox || !scaleBox) {
      throw new Error(
        "Expected both settings trigger and scale control bounds",
      );
    }

    const overlapsHorizontally =
      settingsBox.x < scaleBox.x + scaleBox.width &&
      settingsBox.x + settingsBox.width > scaleBox.x;
    const overlapsVertically =
      settingsBox.y < scaleBox.y + scaleBox.height &&
      settingsBox.y + settingsBox.height > scaleBox.y;

    expect(overlapsHorizontally && overlapsVertically).toBe(false);
  });

  test("defaults the controls panel closed on a mobile viewport, and Explore opens it", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByTestId(E2E.panelToggle);
    const viewport = page.getByTestId(E2E.panelViewport);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(viewport).toBeHidden();

    await trigger.click();

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(viewport).toBeVisible();
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

    await legendTrigger.click();
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

    async function dragHandleBy(deltaY: number) {
      // Waits out the handle's own entrance/settle animation (hover()'s
      // actionability checks include an element-stable wait) so the
      // subsequent boundingBox() read reflects its resting position, not a
      // mid-animation frame the synthetic drag below would then miss.
      await handle.hover();
      const box = await handle.boundingBox();
      if (!box) {
        throw new Error("Panel sheet handle was not rendered");
      }
      const dragX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(dragX, startY);
      await page.mouse.down();
      await page.mouse.move(dragX, startY + deltaY, { steps: 12 });
      await page.mouse.up();
    }

    await dragHandleBy(-240);
    await expect(panel).toHaveAttribute("data-panel-size", "full");
    await expect(handle).toHaveAttribute("aria-pressed", "true");

    await dragHandleBy(240);
    await expect(panel).toHaveAttribute("data-panel-size", "medium");
    await expect(handle).toHaveAttribute("aria-pressed", "false");
  });
});
