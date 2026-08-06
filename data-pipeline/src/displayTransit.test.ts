import { describe, expect, it } from "vitest";
import { createDisplayTransit } from "./displayTransit";

describe("createDisplayTransit", () => {
  it("truncates LineString coordinate precision without dropping points", () => {
    const source = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "1", name: "Line", network: "Gautrain" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.1881234567, -25.7461234567],
              [28.2775123456, -25.7825123456],
            ],
          },
        },
      ],
    };

    const result = createDisplayTransit(source);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [28.18812, -25.74612],
        [28.27751, -25.78251],
      ],
    });
  });

  it("leaves Point geometries intact aside from precision truncation", () => {
    const source = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "1", name: "Station", network: "PRASA" },
          geometry: {
            type: "Point" as const,
            coordinates: [28.18812345, -25.74612345],
          },
        },
      ],
    };

    const result = createDisplayTransit(source);

    expect(result.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [28.18812, -25.74612],
    });
  });

  it("does not mutate the source collection", () => {
    const source = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "1", name: "Station", network: "PRASA" },
          geometry: {
            type: "Point" as const,
            coordinates: [28.18812345, -25.74612345],
          },
        },
      ],
    };

    createDisplayTransit(source);

    expect(source.features[0]?.geometry.coordinates).toEqual([
      28.18812345, -25.74612345,
    ]);
  });
});
