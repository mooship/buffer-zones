import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import type { PipelineSource, RegionPipelineConfig } from "./pipelineSource";

describe("PipelineSource/RegionPipelineConfig", () => {
  it("describes a named, fetchable output for a region", async () => {
    const emptyCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    const source: PipelineSource = {
      layerId: "example",
      regionId: "gauteng",
      fetch: async () => emptyCollection,
      outputFileName: "example.display.v1.geojson",
    };
    await expect(source.fetch()).resolves.toEqual(emptyCollection);
  });

  it("groups sources and metros under one region config", () => {
    const config: RegionPipelineConfig = {
      regionId: "gauteng",
      metros: [],
      sources: [],
    };
    expect(config.regionId).toBe("gauteng");
  });
});
