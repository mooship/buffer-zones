import { describe, expect, it } from "vitest";
import { GAUTENG_PIPELINE_CONFIG } from "./gautengPipelineConfig";

describe("GAUTENG_PIPELINE_CONFIG", () => {
  it("has one source per current output transit layer", () => {
    expect(GAUTENG_PIPELINE_CONFIG.regionId).toBe("gauteng");
    expect(
      GAUTENG_PIPELINE_CONFIG.sources.map((s) => s.layerId).sort(),
    ).toEqual(["bus", "bus-rapid-transit", "commuter-rail", "rapid-rail"]);
  });

  it("maps each source to the same output filename run.ts writes today", () => {
    const byLayerId = Object.fromEntries(
      GAUTENG_PIPELINE_CONFIG.sources.map((s) => [s.layerId, s.outputFileName]),
    );
    expect(byLayerId["rapid-rail"]).toBe("rapid-rail.display.v1.geojson");
    expect(byLayerId["commuter-rail"]).toBe("commuter-rail.display.v1.geojson");
    expect(byLayerId["bus-rapid-transit"]).toBe(
      "bus-rapid-transit.display.v1.geojson",
    );
    expect(byLayerId.bus).toBe("bus.display.v1.geojson");
  });

  it("includes all 9 Gauteng metros", () => {
    expect(GAUTENG_PIPELINE_CONFIG.metros).toHaveLength(9);
  });

  it("tags every source with the gauteng region id", () => {
    for (const source of GAUTENG_PIPELINE_CONFIG.sources) {
      expect(source.regionId).toBe("gauteng");
    }
  });
});
