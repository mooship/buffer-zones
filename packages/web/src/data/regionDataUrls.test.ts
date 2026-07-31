import { describe, expect, it } from "vitest";
import { buildRegionDataUrls } from "./regionDataUrls";

describe("buildRegionDataUrls", () => {
  it("builds one URL per configured region", () => {
    expect(buildRegionDataUrls("townships.display.v1.geojson")).toEqual([
      "/data/gauteng/townships.display.v1.geojson",
    ]);
  });
});
