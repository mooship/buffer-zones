import type { LayerDefinition } from "@buffer-zones/shared";
import type { Feature } from "geojson";
import { describe, expect, it } from "vitest";
import {
  COMMUTE_BUCKET_COLORS,
  TRANSIT_DISTANCE_BUCKET_COLORS,
} from "../constants/colorScale";
import { createLayerConfig } from "./createLayerConfig";

describe("createLayerConfig", () => {
  it("produces a styleFn for a choropleth layer that colors by commuteMinutes", () => {
    const definition: LayerDefinition = {
      id: "townships",
      label: "Modeled car time",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: true,
      available: true,
      style: { kind: "choropleth", propertyKey: "commuteMinutes" },
    };

    const config = createLayerConfig(definition);
    const feature = {
      type: "Feature",
      properties: { commuteMinutes: 15 },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn).toBeDefined();
    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: COMMUTE_BUCKET_COLORS.short,
    });
  });

  it("styles a choropleth feature with a missing value as no-data", () => {
    const definition: LayerDefinition = {
      id: "townships",
      label: "Modeled car time",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: true,
      available: true,
      style: { kind: "choropleth", propertyKey: "commuteMinutes" },
    };

    const config = createLayerConfig(definition);
    const feature = {
      type: "Feature",
      properties: { commuteMinutes: null },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: COMMUTE_BUCKET_COLORS.noData,
    });
  });

  it("gives recognized township sub-places a prominent boundary", () => {
    const definition: LayerDefinition = {
      id: "townships",
      label: "Modeled car time",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: true,
      available: true,
      style: { kind: "choropleth", propertyKey: "commuteMinutes" },
    };
    const feature = {
      type: "Feature",
      properties: { name: "Mamelodi Ext 17", commuteMinutes: 35 },
      geometry: null,
    } as unknown as Feature;

    expect(createLayerConfig(definition).styleFn?.(feature)).toMatchObject({
      weight: 0,
      fillOpacity: 0.78,
    });
  });

  it("produces a styleFn for a choropleth layer that colors by nearestTransitKm", () => {
    const definition: LayerDefinition = {
      id: "nearest-transit",
      label: "Distance to Nearest Transit",
      dataSource: "/data/townships.v1.geojson",
      layerType: "choropleth",
      defaultVisible: false,
      available: true,
      style: { kind: "choropleth", propertyKey: "nearestTransitKm" },
    };

    const config = createLayerConfig(definition);
    const feature = {
      type: "Feature",
      properties: { nearestTransitKm: 30 },
      geometry: null,
    } as unknown as Feature;

    expect(config.styleFn?.(feature)).toMatchObject({
      fillColor: TRANSIT_DISTANCE_BUCKET_COLORS.veryFar,
    });
  });

  it("produces static pathOptions for a line layer", () => {
    const definition: LayerDefinition = {
      id: "gautrain",
      label: "Gautrain",
      dataSource: "/data/gautrain.v1.geojson",
      layerType: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#A87FE0", weight: 3 },
    };

    const config = createLayerConfig(definition);

    expect(config.pathOptions).toEqual({
      color: "#A87FE0",
      weight: 3,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    });
    expect(config.styleFn).toBeUndefined();
  });

  it("produces static pathOptions for a point layer", () => {
    const definition: LayerDefinition = {
      id: "gautrain",
      label: "Gautrain",
      dataSource: "/data/gautrain.v1.geojson",
      layerType: "point",
      defaultVisible: false,
      available: true,
      style: { kind: "point", color: "#A87FE0", radius: 4 },
    };

    const config = createLayerConfig(definition);

    expect(config).toEqual({
      pathOptions: { color: "#A87FE0", fillColor: "#A87FE0" },
    });
  });

  it("returns an empty config for a layer without a style", () => {
    const definition: LayerDefinition = {
      id: "myciti",
      label: "MyCiTi",
      dataSource: "/data/myciti.v1.geojson",
      layerType: "line",
      defaultVisible: false,
      available: false,
    };

    expect(createLayerConfig(definition)).toEqual({});
  });
});
