import { expect, test } from "./fixtures";

test.describe("layer toggles", () => {
  test("toggling a transit layer on adds it to the map, and off removes it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Map layers" }).click();

    const gautrainCheckbox = page.getByRole("checkbox", {
      name: "Gautrain",
      exact: true,
    });
    await expect(gautrainCheckbox).not.toBeChecked();

    const paneBefore = page.locator(".leaflet-transit-pane path");
    await expect(paneBefore).toHaveCount(0);

    await gautrainCheckbox.check();
    await expect(gautrainCheckbox).toBeChecked();
    await expect(
      page.locator(".leaflet-transit-pane path").first(),
    ).toBeVisible();

    await gautrainCheckbox.uncheck();
    await expect(gautrainCheckbox).not.toBeChecked();
    await expect(page.locator(".leaflet-transit-pane path")).toHaveCount(0);
  });

  test("disables layers that are not yet available", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Map layers" }).click();

    const myciti = page.getByRole("checkbox", { name: "MyCiTi" });
    await expect(myciti).toBeDisabled();
    await expect(page.getByText("Not yet available").first()).toBeVisible();
  });
});
