import { expect, test } from "./fixtures";

test.describe("township browser", () => {
  test("searches, expands a group, and selects a place to see its details", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Browse places" }).click();

    await page
      .getByRole("searchbox", { name: "Search townships" })
      .fill("Mamelodi");

    const group = page.getByRole("button", { name: /browse mamelodi/i });
    await expect(group).toBeVisible();
    await group.click();
    await expect(group).toHaveAttribute("aria-expanded", "true");

    const place = page
      .getByRole("button", { name: /mamelodi.*modeled car time/i })
      .first();
    await place.click();

    const panel = page.getByRole("tabpanel");
    await expect(
      panel.getByRole("heading", { name: /mamelodi/i }),
    ).toBeVisible();
    await expect(panel.getByText("Nearest job centre")).toBeVisible();
  });
});
