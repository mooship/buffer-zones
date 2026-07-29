import type { LayerId, MetroId } from "@buffer-zones/shared";
import { describe, expect, it } from "vitest";
import { getLayerDefinition, getLayerDefinitions } from "./registry";

const COMMON_LAYER_IDS: LayerId[] = [
  "townships",
  "gautrain",
  "gautrain-bus",
  "nearest-transit",
  "myciti",
  "prasa",
  "metrobus",
  "durban-transport",
];

const METRO_IDS: MetroId[] = ["tshwane", "johannesburg"];

describe.each(METRO_IDS)("getLayerDefinitions(%s)", (metroId) => {
  it("includes an entry for every layer common to all metros", () => {
    const ids = getLayerDefinitions(metroId).map((layer) => layer.id);
    expect(ids).toEqual(expect.arrayContaining(COMMON_LAYER_IDS));
  });

  it("has no duplicate ids", () => {
    const ids = getLayerDefinitions(metroId).map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only defaults available layers to visible", () => {
    const defaultVisible = getLayerDefinitions(metroId).filter(
      (layer) => layer.defaultVisible,
    );
    expect(defaultVisible.every((layer) => layer.available)).toBe(true);
  });

  it("getLayerDefinition finds a registered layer by id", () => {
    expect(getLayerDefinition("gautrain", metroId)?.label).toBe("Gautrain");
  });

  it("getLayerDefinition returns undefined for an unregistered id", () => {
    // @ts-expect-error deliberately invalid id for the runtime-safety test
    expect(getLayerDefinition("not-a-real-layer", metroId)).toBeUndefined();
  });

  it("points every layer's dataSource at a .geojson file under /data/<metro>/", () => {
    for (const layer of getLayerDefinitions(metroId)) {
      expect(layer.dataSource).toMatch(
        new RegExp(`^/data/${metroId}/[\\w.-]+\\.geojson$`),
      );
    }
  });

  it("gives every line layer a valid hex colour", () => {
    const lineLayers = getLayerDefinitions(metroId).filter(
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
    const choroplethLayers = getLayerDefinitions(metroId).filter(
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

describe("getLayerDefinitions availability per metro", () => {
  it("marks Tshwane's own operator (A Re Yeng) available only for Tshwane", () => {
    const tshwaneAvailable = getLayerDefinitions("tshwane")
      .filter((layer) => layer.available)
      .map((layer) => layer.id)
      .sort();
    expect(tshwaneAvailable).toEqual(
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

  it("marks Johannesburg's own operator (Rea Vaya) available only for Johannesburg", () => {
    const johannesburgAvailable = getLayerDefinitions("johannesburg")
      .filter((layer) => layer.available)
      .map((layer) => layer.id)
      .sort();
    expect(johannesburgAvailable).toEqual(
      [
        "gautrain",
        "gautrain-bus",
        "nearest-transit",
        "prasa",
        "rea-vaya",
        "townships",
      ].sort(),
    );
  });

  it("omits A Re Yeng entirely for Johannesburg and Rea Vaya entirely for Tshwane", () => {
    const tshwaneIds = getLayerDefinitions("tshwane").map((layer) => layer.id);
    const johannesburgIds = getLayerDefinitions("johannesburg").map(
      (layer) => layer.id,
    );
    expect(tshwaneIds).not.toContain("rea-vaya");
    expect(johannesburgIds).not.toContain("a-re-yeng");
  });
});
