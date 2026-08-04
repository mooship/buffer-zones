import { describe, expect, it } from "vitest";
import type { DomainConfig } from "../types/layer";
import { createRegistry } from "./createRegistry";

const domain: DomainConfig = {
  layers: [
    {
      id: "a",
      label: "Layer A",
      dataSource: ["/data/a.geojson"],
      geometryKind: "line",
      defaultVisible: true,
      available: true,
      style: { kind: "line", color: "#000", weight: 1, legendLabel: "A" },
    },
    {
      id: "b",
      label: "Layer B",
      dataSource: ["/data/b.geojson"],
      geometryKind: "choropleth",
      defaultVisible: false,
      available: true,
      style: {
        kind: "choropleth",
        propertyKey: "value",
        buckets: [],
        baseOpacity: 0.5,
      },
    },
  ],
  layerGroups: [
    {
      id: "g1",
      title: "Group 1",
      selectionMode: "independent",
      layerIds: ["a"],
    },
  ],
};

describe("createRegistry", () => {
  it("getLayers returns all layers", () => {
    const { getLayers } = createRegistry(domain);
    expect(getLayers().map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("getStory returns undefined when the domain has no story", () => {
    const { getStory } = createRegistry(domain);
    expect(getStory()).toBeUndefined();
  });

  it("getStory returns the domain's story when present", () => {
    const { getStory } = createRegistry({
      ...domain,
      story: { title: "Why this map exists", body: "Some context." },
    });
    expect(getStory()).toEqual({
      title: "Why this map exists",
      body: "Some context.",
    });
  });

  it("getLayer returns the matching layer by id", () => {
    const { getLayer } = createRegistry(domain);
    expect(getLayer("a")?.label).toBe("Layer A");
  });

  it("getLayer returns undefined for an unknown id", () => {
    const { getLayer } = createRegistry(domain);
    expect(getLayer("does-not-exist")).toBeUndefined();
  });

  it("getLayerGroups returns all groups", () => {
    const { getLayerGroups } = createRegistry(domain);
    expect(getLayerGroups().map((g) => g.id)).toEqual(["g1"]);
  });
});
