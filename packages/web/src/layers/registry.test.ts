import type { LayerId } from "@buffer-zones/shared";
import { getLayerDefinition, getLayerDefinitions } from "./registry";

describe("getLayerDefinitions", () => {
  it("returns a stable shared definition list", () => {
    const first = getLayerDefinitions();
    const second = getLayerDefinitions();

    expect(first).toBe(second);
  });

  it("includes an entry for every layer common", () => {
    const ids = getLayerDefinitions().map((layer) => layer.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "townships",
        "nearest-transit",
        "rapid-rail",
        "bus",
        "commuter-rail",
      ]),
    );
  });

  it("points every layer's dataSource at .geojson files under /data/<region>/", () => {
    for (const layer of getLayerDefinitions()) {
      expect(layer.dataSource.length).toBeGreaterThan(0);
      for (const source of layer.dataSource) {
        expect(source).toMatch(/^\/data\/[\w-]+\/[\w.-]+\.geojson$/);
      }
    }
  });

  it("returns specific layer by id", () => {
    expect(getLayerDefinition("rapid-rail")?.label).toBe("Rapid Rail");
    expect(getLayerDefinition("not-a-real-layer" as LayerId)).toBeUndefined();
  });
});
