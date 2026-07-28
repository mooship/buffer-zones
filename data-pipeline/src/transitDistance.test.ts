import { describe, expect, it } from "vitest";
import { computeNearestTransitKm } from "./transitDistance";

describe("computeNearestTransitKm", () => {
  it("returns the distance in km to the nearest feature across all given networks", () => {
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
      ],
    };
    const aReYeng = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { id: "way/1", name: "Line 1A", network: "A Re Yeng" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.0, -25.75],
              [28.05, -25.75],
            ],
          },
        },
      ],
    };

    const result = computeNearestTransitKm(
      [
        { lat: -25.7487, lon: 28.2379 },
        { lat: -25.75, lon: 28.025 },
      ],
      [gautrain, aReYeng],
    );

    expect(result[0]).toBeCloseTo(0, 3);
    expect(result[1]).toBeCloseTo(0, 1);
  });

  it("returns null for every centroid when no transit features were fetched", () => {
    const empty = { type: "FeatureCollection" as const, features: [] };

    const result = computeNearestTransitKm(
      [{ lat: -25.75, lon: 28.2 }],
      [empty, empty],
    );

    expect(result).toEqual([null]);
  });
});
