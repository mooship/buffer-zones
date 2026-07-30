import { expect, test } from "./fixtures";

test.describe("layer toggles", () => {
  test("toggling a transit layer on adds it to the map, and off removes it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Map layers" }).click();

    const rapidRailCheckbox = page.getByRole("checkbox", {
      name: "Rapid Rail",
      exact: true,
    });
    await expect(rapidRailCheckbox).not.toBeChecked();

    const paneBefore = page.locator(".leaflet-transit-pane path");
    await expect(paneBefore).toHaveCount(0);

    await rapidRailCheckbox.check();
    await expect(rapidRailCheckbox).toBeChecked();
    await expect(
      page.locator(".leaflet-transit-pane path").first(),
    ).toBeVisible();

    await rapidRailCheckbox.uncheck();
    await expect(rapidRailCheckbox).not.toBeChecked();
    await expect(page.locator(".leaflet-transit-pane path")).toHaveCount(0);
  });
});
