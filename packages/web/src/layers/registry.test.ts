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

  it("points every layers dataSource at a .geojson file under /data/national/", () => {
    for (const layer of getLayerDefinitions()) {
      expect(layer.dataSource).toMatch(/^\/data\/national\/[\w.-]+\.geojson$/);
    }
  });

  it("returns specific layer by id", () => {
    expect(getLayerDefinition("rapid-rail")?.label).toBe("Rapid Rail");
    expect(getLayerDefinition("not-a-real-layer" as LayerId)).toBeUndefined();
  });
});
