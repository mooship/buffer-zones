import { describe, expect, it } from "vitest";
import type {
  ChoroplethLayerStyle,
  Layer,
  LayerGroup,
  LineLayerStyle,
  PointLayerStyle,
} from "./genericLayer";

describe("generic Layer/LayerGroup types", () => {
  it("accepts a choropleth layer with colour buckets", () => {
    const style: ChoroplethLayerStyle = {
      kind: "choropleth",
      propertyKey: "commuteMinutes",
      buckets: [{ max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" }],
      baseOpacity: 0.18,
    };
    const layer: Layer = {
      id: "example-choropleth",
      label: "Example",
      description: "An example choropleth layer.",
      dataSource: ["/data/example/example.geojson"],
      geometryKind: "choropleth",
      defaultVisible: true,
      available: true,
      style,
    };
    expect(layer.style.kind).toBe("choropleth");
  });

  it("accepts a line layer with a legend label", () => {
    const style: LineLayerStyle = {
      kind: "line",
      color: "#E69F00",
      weight: 3,
      legendLabel: "Example line",
    };
    expect(style.legendLabel).toBe("Example line");
  });

  it("accepts a point layer with a legend label", () => {
    const style: PointLayerStyle = {
      kind: "point",
      color: "#009E73",
      radius: 4,
      legendLabel: "Example point",
    };
    expect(style.legendLabel).toBe("Example point");
  });

  it("accepts a layer with a companion source and interaction config", () => {
    const layer: Layer = {
      id: "example-selectable",
      label: "Example",
      dataSource: ["/data/example/a.geojson"],
      companionSource: "/data/example/b.geojson",
      geometryKind: "choropleth",
      defaultVisible: false,
      available: true,
      style: {
        kind: "choropleth",
        propertyKey: "value",
        buckets: [],
        baseOpacity: 0.18,
      },
      interaction: { selectable: true, labelField: "name" },
    };
    expect(layer.interaction?.selectable).toBe(true);
  });

  it("accepts a choropleth style with an emphasis resolver", () => {
    const style: ChoroplethLayerStyle = {
      kind: "choropleth",
      propertyKey: "commuteMinutes",
      buckets: [],
      baseOpacity: 0.18,
      emphasisOpacity: 0.78,
      resolveEmphasis: (properties) => properties?.name === "example",
    };
    expect(style.resolveEmphasis?.({ name: "example" })).toBe(true);
  });

  it("accepts an exclusive and an independent layer group", () => {
    const exclusive: LayerGroup = {
      id: "example-exclusive",
      title: "Example group",
      description: "Only one overlay can be active at a time.",
      selectionMode: "exclusive",
      layerIds: ["example-choropleth"],
    };
    const independent: LayerGroup = {
      id: "example-independent",
      title: "Example networks",
      selectionMode: "independent",
      layerIds: ["example-selectable"],
    };
    expect(exclusive.selectionMode).toBe("exclusive");
    expect(independent.description).toBeUndefined();
  });
});
