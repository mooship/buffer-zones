import type { LayerId } from "@buffer-zones/shared";
import { describe, expect, it } from "vitest";
import { LAYER_REGISTRY, getLayerDefinition } from "./registry";

const ALL_LAYER_IDS: LayerId[] = [
  "townships",
  "gautrain",
  "a-re-yeng",
  "unemployment",
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
      ["a-re-yeng", "gautrain", "prasa", "townships"].sort(),
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
});
