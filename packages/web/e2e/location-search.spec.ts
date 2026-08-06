import { expect, GEOCODER_RESULT, test } from "./fixtures";
import { E2E } from "./selectors";

test.describe("location search", () => {
  test("stays usable under the map's feature-search overlay", async ({
    page,
  }) => {
    await page.goto("/");
    // The map's keyboard-only feature search only mounts once the township
    // choropleth data has loaded, and it shares this control's corner of the
    // screen -- interacting any earlier can't catch it shadowing the input.
    await expect(page.getByTestId(E2E.selectableFeatureSearch)).toBeAttached({
      timeout: 15_000,
    });

    const input = page.getByTestId(E2E.locationSearchInput);
    await input.click();
    await expect(input).toBeFocused();

    await input.fill("soweto");
    const firstResult = page
      .getByTestId(E2E.locationSearchResults)
      .getByRole("option")
      .first();
    await expect(firstResult).toHaveText(GEOCODER_RESULT.display_name);

    await firstResult.click();

    await expect(input).toHaveValue(GEOCODER_RESULT.display_name);
    await expect(page.getByTestId(E2E.locationOutOfCoverage)).toHaveCount(0);
  });
});
