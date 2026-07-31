import { describe, expect, it } from "vitest";
import { getLayer, getLayerGroups, getLayers } from "./registry";

describe("registry", () => {
  it("returns the 6 gauteng-spatial-legacy layers", () => {
    const layers = getLayers();
    expect(layers.map((l) => l.id)).toEqual(
      expect.arrayContaining([
        "townships",
        "nearest-transit",
        "rapid-rail",
        "bus-rapid-transit",
        "commuter-rail",
        "bus",
      ]),
    );
  });

  it("every layer dataSource points at a per-region geojson URL", () => {
    for (const layer of getLayers()) {
      for (const url of layer.dataSource) {
        expect(url).toMatch(/^\/data\/[\w-]+\/[\w.-]+\.geojson$/);
      }
    }
  });

  it("looks up a single layer by id", () => {
    expect(getLayer("rapid-rail")?.label).toBe("Rapid Rail");
    expect(getLayer("does-not-exist")).toBeUndefined();
  });

  it("returns the 2 layer groups", () => {
    const groups = getLayerGroups();
    expect(groups.map((g) => g.id)).toEqual([
      "access-to-opportunity",
      "transit-networks",
    ]);
  });
});
