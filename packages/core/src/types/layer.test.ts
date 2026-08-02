import { describe, expect, it } from "vitest";
import type { Layer } from "./layer";

describe("Layer type", () => {
  it("accepts a layer without hasPointGeometry", () => {
    const layer: Layer = {
      id: "bus",
      label: "Bus",
      dataSource: ["/data/gauteng/bus.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#CC79A7", weight: 3, legendLabel: "Bus" },
    };
    expect(layer.hasPointGeometry).toBeUndefined();
  });

  it("accepts a layer with hasPointGeometry: true", () => {
    const layer: Layer = {
      id: "rapid-rail",
      label: "Rapid Rail",
      dataSource: ["/data/gauteng/rapid-rail.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: {
        kind: "line",
        color: "#E69F00",
        weight: 3,
        legendLabel: "Rapid Rail",
      },
      hasPointGeometry: true,
    };
    expect(layer.hasPointGeometry).toBe(true);
  });
});
