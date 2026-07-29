import { expect, test } from "./fixtures";

test.describe("app shell", () => {
  test("loads with the expected landmarks and a rendered map", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/buffer zones/i);
    await expect(
      page.getByRole("link", { name: /skip to map information/i }),
    ).toHaveAttribute("href", "#map-information");
    await expect(page.getByRole("main")).toHaveAttribute(
      "id",
      "map-information",
    );
    await expect(
      page.getByRole("heading", { name: "Buffer Zones", level: 1 }),
    ).toBeVisible();

    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(
      page.locator(".leaflet-container path.leaflet-interactive").first(),
    ).toBeVisible();
  });

  test("shows the map legend and layer controls by default via the layers tab", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("tab", { name: "Map layers" }).click();

    await expect(
      page.getByRole("checkbox", { name: "Modeled car time" }),
    ).toBeChecked();
    await expect(page.getByText("Map legend")).toBeVisible();
  });
});
