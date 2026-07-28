import { describe, expect, it } from "vitest";
import { computeNearestGautrainStationKm } from "./gautrainDistance";

describe("computeNearestGautrainStationKm", () => {
  it("returns the distance in km to the nearest station point for each centroid", () => {
    const gautrain = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "node/1", name: "Hatfield", network: "Gautrain" },
          geometry: {
            type: "Point" as const,
            coordinates: [28.2379, -25.7487],
          },
        },
        {
          type: "Feature" as const,
          properties: { id: "way/1", name: "Line 1A", network: "Gautrain" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.2, -25.75],
              [28.25, -25.75],
            ],
          },
        },
      ],
    };

    const result = computeNearestGautrainStationKm(
      [
        { lat: -25.7487, lon: 28.2379 },
        { lat: -26.2, lon: 28.0 },
      ],
      gautrain,
    );

    expect(result[0]).toBeCloseTo(0, 3);
    expect(result[1]).toBeGreaterThan(0);
  });

  it("returns null for every centroid when there are no station points", () => {
    const gautrain = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "way/1", name: "Line 1A", network: "Gautrain" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.2, -25.75],
              [28.25, -25.75],
            ],
          },
        },
      ],
    };

    const result = computeNearestGautrainStationKm(
      [{ lat: -25.75, lon: 28.2 }],
      gautrain,
    );

    expect(result).toEqual([null]);
  });
});
