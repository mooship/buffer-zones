import type { Layer } from "@stratum/core";
import type { Feature } from "geojson";
import { describe, expect, it } from "vitest";
import { createLayerConfig } from "./createLayerConfig";

function choroplethLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: "townships",
    label: "Modeled car time",
    dataSource: ["/data/gauteng/townships.v1.geojson"],
    geometryKind: "choropleth",
    defaultVisible: true,
    available: true,
    style: {
      kind: "choropleth",
      propertyKey: "commuteMinutes",
      buckets: [
        { max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" },
        { max: 40, color: "#C9A227", label: "Moderate (21–40 min)" },
        { max: 60, color: "#D6703F", label: "Long (41–60 min)" },
        {
          max: Number.POSITIVE_INFINITY,
          color: "#C1502E",
          label: "Very long (> 60 min)",
        },
      ],
      baseOpacity: 0.18,
      emphasisOpacity: 0.78,
      resolveEmphasis: (properties) => properties?.name === "Mamelodi Ext 17",
    },
    ...overrides,
  };
}

describe("createLayerConfig", () => {
  it("produces a styleFn for a choropleth layer that colors by commuteMinutes", () => {
    const config = createLayerConfig(choroplethLayer());
    const feature = {
      type: "Feature",
      properties: { commuteMinutes: 15 },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn).toBeDefined();
    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: "#7A9B6E",
      fillOpacity: 0.18,
    });
  });

  it("styles a choropleth feature with a missing value as no-data", () => {
    const config = createLayerConfig(choroplethLayer());
    const feature = {
      type: "Feature",
      properties: { commuteMinutes: null },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: "#8A93A5",
    });
  });

  it("gives features the emphasis resolver selects a higher opacity", () => {
    const config = createLayerConfig(choroplethLayer());
    const feature = {
      type: "Feature",
      properties: { name: "Mamelodi Ext 17", commuteMinutes: 35 },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn?.(feature)).toMatchObject({
      weight: 0,
      fillOpacity: 0.78,
    });
  });

  it("picks the correct bucket even when buckets are declared out of ascending order", () => {
    const config = createLayerConfig(
      choroplethLayer({
        style: {
          kind: "choropleth",
          propertyKey: "commuteMinutes",
          buckets: [
            {
              max: Number.POSITIVE_INFINITY,
              color: "#C1502E",
              label: "Very long (> 60 min)",
            },
            { max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" },
            { max: 60, color: "#D6703F", label: "Long (41–60 min)" },
            { max: 40, color: "#C9A227", label: "Moderate (21–40 min)" },
          ],
          baseOpacity: 0.18,
        },
      }),
    );
    const feature = {
      type: "Feature",
      properties: { commuteMinutes: 15 },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: "#7A9B6E",
    });
  });

  it("produces a styleFn for a choropleth layer that colors by nearestTransitKm", () => {
    const config = createLayerConfig(
      choroplethLayer({
        id: "nearest-transit",
        label: "Distance to Nearest Transit",
        defaultVisible: false,
        style: {
          kind: "choropleth",
          propertyKey: "nearestTransitKm",
          buckets: [
            { max: 1, color: "#CFE3F5", label: "Near (≤ 1 km)" },
            { max: 3, color: "#7FB2E5", label: "Moderate (1–3 km)" },
            { max: 8, color: "#3673B8", label: "Far (3–8 km)" },
            {
              max: Number.POSITIVE_INFINITY,
              color: "#123F6E",
              label: "Very far (> 8 km)",
            },
          ],
          baseOpacity: 0.18,
          emphasisOpacity: 0.78,
        },
      }),
    );
    const feature = {
      type: "Feature",
      properties: { nearestTransitKm: 30 },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: "#123F6E",
    });
  });

  it("produces static pathOptions for a line layer", () => {
    const layer: Layer = {
      id: "gautrain",
      label: "Gautrain",
      dataSource: ["/data/gauteng/gautrain.v1.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: {
        kind: "line",
        color: "#A87FE0",
        weight: 3,
        legendLabel: "Gautrain",
      },
    };

    const config = createLayerConfig(layer);

    expect(config.pathOptions).toEqual({
      color: "#A87FE0",
      weight: 3,
      opacity: 0.95,
      noClip: true,
      lineCap: "round",
      lineJoin: "round",
    });
    expect(config.styleFn).toBeUndefined();
  });

  it("produces static pathOptions for a point layer", () => {
    const layer: Layer = {
      id: "gautrain",
      label: "Gautrain",
      dataSource: ["/data/gauteng/gautrain.v1.geojson"],
      geometryKind: "point",
      defaultVisible: false,
      available: true,
      style: {
        kind: "point",
        color: "#A87FE0",
        radius: 4,
        legendLabel: "Gautrain",
      },
    };

    const config = createLayerConfig(layer);

    expect(config).toEqual({
      pathOptions: { color: "#A87FE0", fillColor: "#A87FE0" },
    });
  });
});
