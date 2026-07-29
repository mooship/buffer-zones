import { expect, test } from "./fixtures";

test.describe("responsive panel", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("defaults the controls panel closed on a mobile viewport, and Explore opens it", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /explore/i });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("tablist", { name: "Map panel" })).toBeHidden();

    await trigger.click();

    await expect(page.getByRole("button", { name: /close/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(
      page.getByRole("tablist", { name: "Map panel" }),
    ).toBeVisible();
  });
});
