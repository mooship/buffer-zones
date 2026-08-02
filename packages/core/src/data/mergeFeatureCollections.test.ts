import { describe, expect, it } from "vitest";
import { mergeFeatureCollections } from "./mergeFeatureCollections";

describe("mergeFeatureCollections", () => {
  it("concatenates features from every collection in order", () => {
    const a = {
      type: "FeatureCollection" as const,
      features: [
        { type: "Feature" as const, properties: { id: 1 }, geometry: null },
      ],
    };
    const b = {
      type: "FeatureCollection" as const,
      features: [
        { type: "Feature" as const, properties: { id: 2 }, geometry: null },
      ],
    };

    expect(mergeFeatureCollections([a, b])).toEqual({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { id: 1 }, geometry: null },
        { type: "Feature", properties: { id: 2 }, geometry: null },
      ],
    });
  });

  it("returns an empty collection when given no collections", () => {
    expect(mergeFeatureCollections([])).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });
});
