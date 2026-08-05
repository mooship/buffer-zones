import type { MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { isPointInPolygon } from "./isPointInPolygon";

const square: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [28.0, -26.0],
      [28.1, -26.0],
      [28.1, -25.9],
      [28.0, -25.9],
      [28.0, -26.0],
    ],
  ],
};

const twoSquares: MultiPolygon = {
  type: "MultiPolygon",
  coordinates: [
    square.coordinates,
    [
      [
        [29.0, -27.0],
        [29.1, -27.0],
        [29.1, -26.9],
        [29.0, -26.9],
        [29.0, -27.0],
      ],
    ],
  ],
};

describe("isPointInPolygon", () => {
  it("returns true for a point inside a Polygon", () => {
    expect(isPointInPolygon([28.05, -25.95], square)).toBe(true);
  });

  it("returns false for a point outside a Polygon", () => {
    expect(isPointInPolygon([27.0, -25.0], square)).toBe(false);
  });

  it("returns true for a point inside either part of a MultiPolygon", () => {
    expect(isPointInPolygon([29.05, -26.95], twoSquares)).toBe(true);
  });

  it("returns false for a point outside every part of a MultiPolygon", () => {
    expect(isPointInPolygon([0, 0], twoSquares)).toBe(false);
  });

  it("accepts a Feature wrapping the geometry", () => {
    const feature = {
      type: "Feature" as const,
      properties: null,
      geometry: square,
    };
    expect(isPointInPolygon([28.05, -25.95], feature)).toBe(true);
  });
});
