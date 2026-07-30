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
});
