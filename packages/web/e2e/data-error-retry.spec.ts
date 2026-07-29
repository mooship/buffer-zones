import { expect, test } from "./fixtures";

test.describe("data load error and retry", () => {
  test("shows an error when township data fails to load, and recovers on retry", async ({
    page,
  }) => {
    let requestCount = 0;
    await page.route("**/data/townships.display.v1.geojson", (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        return route.fulfill({ status: 500, body: "Internal Server Error" });
      }
      return route.continue();
    });

    await page.goto("/");

    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Map data could not be loaded");

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(alert).not.toBeVisible();
    await expect(
      page.locator(".leaflet-container path.leaflet-interactive").first(),
    ).toBeVisible();
    expect(requestCount).toBe(2);
  });
});
