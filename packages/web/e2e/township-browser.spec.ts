import { expect, test } from "./fixtures";
import { E2E } from "./selectors";
import { ensurePanelOpen } from "./ui";

test.describe("township browser", () => {
  test("searches, expands a group, and selects a place to see its details", async ({
    page,
  }) => {
    await page.goto("/");
    await ensurePanelOpen(page);
    await page.getByTestId(E2E.panelTab.places).click();

    await page.getByTestId(E2E.townshipSearch).fill("Mamelodi");

    const group = page.getByTestId(E2E.townshipGroupMamelodi);
    await expect(group).toBeVisible();
    await group.click();
    await expect(group).toHaveAttribute("aria-expanded", "true");

    const place = page
      .locator(`[data-e2e^="${E2E.townshipPlacePrefix}"]`)
      .first();
    await expect(place).toBeVisible();
    await place.click();

    const panel = page.getByTestId(E2E.townshipSelection);
    await expect(
      panel.getByRole("heading", { name: /mamelodi/i }),
    ).toBeVisible();
    await expect(panel.getByText("Nearest job centre")).toBeVisible();
  });
});
