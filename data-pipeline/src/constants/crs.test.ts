import { reprojectPosition } from "@stratum/core";
import { describe, expect, it } from "vitest";
import { HARTEBEESTHOEK94_LO29 } from "./crs";

describe("HARTEBEESTHOEK94_LO29", () => {
  it("is a proj4 definition that reprojects a known point to its WGS84 equivalent", () => {
    const [lon, lat] = reprojectPosition(
      [-79123.34118003, -2848942.531846167],
      HARTEBEESTHOEK94_LO29,
    );
    expect(lon).toBeCloseTo(28.2114, 6);
    expect(lat).toBeCloseTo(-25.7461, 6);
  });
});
