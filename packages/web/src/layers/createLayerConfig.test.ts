import type { LayerDefinition } from "@buffer-zones/shared";
import type { Feature } from "geojson";
import { describe, expect, it } from "vitest";
import { COMMUTE_BUCKET_COLORS } from "../constants/colorScale";
import { createLayerConfig } from "./createLayerConfig";

describe("createLayerConfig", () => {
  it("produces a styleFn for a choropleth layer that colors by commuteMinutes", () => {
    const definition: LayerDefinition = {
      id: "townships",
      label: "Commute Time",
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
      label: "Commute Time",
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

    expect(config.pathOptions).toEqual({ color: "#A87FE0", weight: 3 });
    expect(config.styleFn).toBeUndefined();
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
