import {
  expect,
  GEOCODER_RESULT,
  GEOCODER_SEARCH_PATTERN,
  test,
} from "./fixtures";
import { E2E } from "./selectors";

/** Outside `SEARCH_COVERAGE_BOUNDS` (mainland South Africa), see `App.tsx`. */
const LONDON_RESULT = {
  place_id: 26262999,
  display_name: "London, Greater London, England, United Kingdom",
  lat: "51.5074",
  lon: "-0.1278",
  boundingbox: ["51.28", "51.68", "-0.51", "0.33"],
};

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

  test("picks a result by keyboard, and Escape clears the input", async ({
    page,
  }) => {
    await page.goto("/");

    const input = page.getByTestId(E2E.locationSearchInput);
    await input.click();
    await input.fill("soweto");

    const firstResult = page
      .getByTestId(E2E.locationSearchResults)
      .getByRole("option")
      .first();
    await expect(firstResult).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await expect(firstResult).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Enter");
    await expect(input).toHaveValue(GEOCODER_RESULT.display_name);
    await expect(page.getByTestId(E2E.locationSearchResults)).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("");
  });

  test("reports no matches for a query the geocoder can't resolve", async ({
    page,
  }) => {
    await page.route(GEOCODER_SEARCH_PATTERN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.goto("/");
    const input = page.getByTestId(E2E.locationSearchInput);
    await input.click();
    await input.fill("nowhereatall");

    await expect(
      page.getByText("No places matched that search."),
    ).toBeVisible();
  });

  test("shows a retry option when the geocoder request fails, and recovers", async ({
    page,
  }) => {
    let requestCount = 0;
    await page.route(GEOCODER_SEARCH_PATTERN, (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        return route.fulfill({ status: 500, body: "Internal Server Error" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([GEOCODER_RESULT]),
      });
    });

    await page.goto("/");
    const input = page.getByTestId(E2E.locationSearchInput);
    await input.click();
    await input.fill("soweto");

    const retryButton = page.getByTestId(E2E.locationSearchRetry);
    await expect(retryButton).toBeVisible();
    await expect(
      page.getByText("Search is unavailable right now. Please try again."),
    ).toBeVisible();

    await retryButton.click();

    await expect(
      page.getByTestId(E2E.locationSearchResults).getByRole("option").first(),
    ).toHaveText(GEOCODER_RESULT.display_name);
    expect(requestCount).toBe(2);
  });

  test("shows an out-of-coverage message for a result outside South Africa, and clears it on a valid pick", async ({
    page,
  }) => {
    await page.route(GEOCODER_SEARCH_PATTERN, (route) => {
      const url = new URL(route.request().url());
      const query = (url.searchParams.get("q") ?? "").toLowerCase();
      const result = query.includes("london") ? LONDON_RESULT : GEOCODER_RESULT;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([result]),
      });
    });

    await page.goto("/");
    const input = page.getByTestId(E2E.locationSearchInput);
    await input.click();
    await input.fill("london");

    const londonResult = page
      .getByTestId(E2E.locationSearchResults)
      .getByRole("option")
      .first();
    await expect(londonResult).toHaveText(LONDON_RESULT.display_name);
    await londonResult.click();

    await expect(page.getByTestId(E2E.locationOutOfCoverage)).toHaveText(
      `${LONDON_RESULT.display_name} is outside South Africa.`,
    );

    await input.fill("soweto");
    const sowetoResult = page
      .getByTestId(E2E.locationSearchResults)
      .getByRole("option")
      .first();
    await expect(sowetoResult).toHaveText(GEOCODER_RESULT.display_name);
    await sowetoResult.click();

    await expect(page.getByTestId(E2E.locationOutOfCoverage)).toHaveCount(0);
  });
});
