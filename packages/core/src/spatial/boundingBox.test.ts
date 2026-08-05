import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { featureCollectionBounds, unionBoundingBoxes } from "./boundingBox";

describe("unionBoundingBoxes", () => {
  it("throws when given no boxes", () => {
    expect(() => unionBoundingBoxes([])).toThrow(
      "At least one bounding box is required",
    );
  });

  it("returns the box unchanged when given a single box", () => {
    const box: [number, number, number, number] = [27.5, -26.5, 28.5, -25.5];
    expect(unionBoundingBoxes([box])).toEqual(box);
  });

  it("returns the smallest box containing every given box", () => {
    const a: [number, number, number, number] = [27.5, -26.5, 28.0, -26.0];
    const b: [number, number, number, number] = [28.0, -27.0, 28.7, -25.9];

    expect(unionBoundingBoxes([a, b])).toEqual([27.5, -27.0, 28.7, -25.9]);
  });
});

describe("featureCollectionBounds", () => {
  it("returns the bounding box spanning every feature's geometry", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: null,
          geometry: { type: "Point", coordinates: [28.0, -26.0] },
        },
        {
          type: "Feature",
          properties: null,
          geometry: { type: "Point", coordinates: [28.5, -25.5] },
        },
      ],
    };

    expect(featureCollectionBounds(collection)).toEqual([
      28.0, -26.0, 28.5, -25.5,
    ]);
  });
});
