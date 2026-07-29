import type { LayerId } from "@buffer-zones/shared";
import { describe, expect, it } from "vitest";
import { LAYER_REGISTRY, getLayerDefinition } from "./registry";

const ALL_LAYER_IDS: LayerId[] = [
  "townships",
  "gautrain",
  "gautrain-bus",
  "a-re-yeng",
  "nearest-transit",
  "myciti",
  "prasa",
  "rea-vaya",
  "metrobus",
  "durban-transport",
];

describe("LAYER_REGISTRY", () => {
  it("includes an entry for every layer defined in the shared LayerId union", () => {
    const ids = LAYER_REGISTRY.map((layer) => layer.id);
    expect(ids).toEqual(expect.arrayContaining(ALL_LAYER_IDS));
  });

  it("has no duplicate ids", () => {
    const ids = LAYER_REGISTRY.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks only layers with shipped data as available", () => {
    const available = LAYER_REGISTRY.filter((layer) => layer.available).map(
      (layer) => layer.id,
    );
    expect(available.sort()).toEqual(
      [
        "a-re-yeng",
        "gautrain",
        "gautrain-bus",
        "nearest-transit",
        "prasa",
        "townships",
      ].sort(),
    );
  });

  it("only defaults available layers to visible", () => {
    const defaultVisible = LAYER_REGISTRY.filter(
      (layer) => layer.defaultVisible,
    );
    expect(defaultVisible.every((layer) => layer.available)).toBe(true);
  });

  it("getLayerDefinition finds a registered layer by id", () => {
    expect(getLayerDefinition("gautrain")?.label).toBe("Gautrain");
  });

  it("getLayerDefinition returns undefined for an unregistered id", () => {
    // @ts-expect-error deliberately invalid id for the runtime-safety test
    expect(getLayerDefinition("not-a-real-layer")).toBeUndefined();
  });

  it("points every layer's dataSource at a .geojson file under /data/", () => {
    for (const layer of LAYER_REGISTRY) {
      expect(layer.dataSource).toMatch(/^\/data\/[\w.-]+\.geojson$/);
    }
  });

  it("gives every line layer a valid hex colour", () => {
    const lineLayers = LAYER_REGISTRY.filter(
      (layer) => layer.style?.kind === "line",
    );
    expect(lineLayers.length).toBeGreaterThan(0);
    for (const layer of lineLayers) {
      expect(layer.style?.kind).toBe("line");
      if (layer.style?.kind === "line") {
        expect(layer.style.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it("gives every choropleth layer a recognised property key", () => {
    const choroplethLayers = LAYER_REGISTRY.filter(
      (layer) => layer.style?.kind === "choropleth",
    );
    expect(choroplethLayers.map((layer) => layer.id).sort()).toEqual(
      ["nearest-transit", "townships"].sort(),
    );
    for (const layer of choroplethLayers) {
      if (layer.style?.kind === "choropleth") {
        expect(["commuteMinutes", "nearestTransitKm"]).toContain(
          layer.style.propertyKey,
        );
      }
    }
  });
});
