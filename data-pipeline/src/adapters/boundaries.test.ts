import { describe, expect, it } from "vitest";
import { normalizeBoundaries } from "./boundaries";

describe("normalizeBoundaries", () => {
  it("maps raw sub-place properties to NormalizedTownship and computes a centroid", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            SP_CODE: "799013001",
            SP_NAME: "Mamelodi SP",
            TotalPop: 334577,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [28.4, -25.68],
                [28.42, -25.68],
                [28.42, -25.66],
                [28.4, -25.66],
                [28.4, -25.68],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeBoundaries(raw);

    expect(result).toHaveLength(1);
    const [township] = result;
    expect(township).toMatchObject({
      id: "799013001",
      name: "Mamelodi SP",
      population: 334577,
    });
    expect(township?.centroid.lat).toBeCloseTo(-25.67, 1);
    expect(township?.centroid.lon).toBeCloseTo(28.41, 1);
  });

  it("omits population when the source field is missing", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { SP_CODE: "1", SP_NAME: "Unnamed" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [28, -25.8],
                [28.1, -25.8],
                [28.1, -25.7],
                [28, -25.7],
                [28, -25.8],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeBoundaries(raw);

    const [township] = result;
    expect(township?.population).toBeUndefined();
  });
});
