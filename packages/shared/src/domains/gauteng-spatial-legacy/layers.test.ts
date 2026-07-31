import { describe, expect, it } from "vitest";
import type { Layer } from "../../types/genericLayer";
import { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";

describe("GAUTENG_SPATIAL_LEGACY_LAYERS", () => {
  it("has exactly the 6 layers the current app ships, in order", () => {
    expect(GAUTENG_SPATIAL_LEGACY_LAYERS.map((l) => l.id)).toEqual([
      "townships",
      "nearest-transit",
      "rapid-rail",
      "bus-rapid-transit",
      "commuter-rail",
      "bus",
    ]);
  });

  it("matches today's townships (commute time) choropleth exactly", () => {
    const layer = GAUTENG_SPATIAL_LEGACY_LAYERS.find(
      (l) => l.id === "townships",
    );
    expect(layer?.label).toBe("Modeled car time");
    expect(layer?.geometryKind).toBe("choropleth");
    expect(layer?.defaultVisible).toBe(true);
    expect(layer?.dataSource).toEqual([
      "/data/gauteng/townships.display.v1.geojson",
    ]);
    expect(layer?.companionSource).toBe(
      "/data/gauteng/township-areas.display.v1.geojson",
    );
    expect(layer?.interaction).toEqual({
      selectable: true,
      labelField: "name",
    });
    const style = layer?.style;
    if (style?.kind !== "choropleth") {
      throw new Error("expected choropleth style");
    }
    expect(style.propertyKey).toBe("commuteMinutes");
    expect(style.buckets).toEqual([
      { max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" },
      { max: 40, color: "#C9A227", label: "Moderate (21–40 min)" },
      { max: 60, color: "#D6703F", label: "Long (41–60 min)" },
      {
        max: Number.POSITIVE_INFINITY,
        color: "#C1502E",
        label: "Very long (> 60 min)",
      },
    ]);
  });

  it("matches today's nearest-transit choropleth exactly", () => {
    const layer = GAUTENG_SPATIAL_LEGACY_LAYERS.find(
      (l) => l.id === "nearest-transit",
    );
    expect(layer?.label).toBe("Distance to Nearest Transit");
    expect(layer?.defaultVisible).toBe(false);
    expect(layer?.dataSource).toEqual([
      "/data/gauteng/townships.display.v1.geojson",
    ]);
    const style = layer?.style;
    if (style?.kind !== "choropleth") {
      throw new Error("expected choropleth style");
    }
    expect(style.propertyKey).toBe("nearestTransitKm");
    expect(style.buckets).toEqual([
      { max: 1, color: "#CFE3F5", label: "Near (≤ 1 km)" },
      { max: 3, color: "#7FB2E5", label: "Moderate (1–3 km)" },
      { max: 8, color: "#3673B8", label: "Far (3–8 km)" },
      {
        max: Number.POSITIVE_INFINITY,
        color: "#123F6E",
        label: "Very far (> 8 km)",
      },
    ]);
  });

  it("matches today's 4 transit line layers exactly", () => {
    const findLayer = (id: string): Layer => {
      const layer = GAUTENG_SPATIAL_LEGACY_LAYERS.find((l) => l.id === id);
      if (!layer) {
        throw new Error(`expected layer ${id}`);
      }
      return layer;
    };
    expect(findLayer("rapid-rail").label).toBe("Rapid Rail");
    expect(findLayer("rapid-rail").dataSource).toEqual([
      "/data/gauteng/rapid-rail.display.v1.geojson",
    ]);
    expect(findLayer("rapid-rail").style).toEqual({
      kind: "line",
      color: "#E69F00",
      weight: 3,
      legendLabel: "Rapid Rail",
    });
    expect(findLayer("bus-rapid-transit").style).toEqual({
      kind: "line",
      color: "#009E73",
      weight: 3,
      legendLabel: "Bus Rapid Transit",
    });
    expect(findLayer("commuter-rail").style).toEqual({
      kind: "line",
      color: "#D55E00",
      weight: 2,
      legendLabel: "Commuter Rail",
    });
    expect(findLayer("bus").style).toEqual({
      kind: "line",
      color: "#CC79A7",
      weight: 3,
      legendLabel: "Bus",
    });
    for (const id of [
      "rapid-rail",
      "bus-rapid-transit",
      "commuter-rail",
      "bus",
    ]) {
      expect(findLayer(id).geometryKind).toBe("line");
      expect(findLayer(id).defaultVisible).toBe(false);
      expect(findLayer(id).available).toBe(true);
    }
  });
});
