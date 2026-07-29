import { describe, expect, it } from "vitest";
import {
  createFeatureCollectionParser,
  featureCollectionSchema,
  townshipFeatureCollectionSchema,
} from "./geoJsonSchemas";

const validRing = [
  [28, -25],
  [28.1, -25],
  [28.1, -25.1],
  [28, -25],
];

function polygonFeature(coordinates: number[][][] = [validRing]) {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates },
  };
}

describe("featureCollectionSchema", () => {
  it("rejects a polygon ring that is not closed", () => {
    const unclosedRing = [
      [28, -25],
      [28.1, -25],
      [28.1, -25.1],
      [28, -25.05],
    ];
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [polygonFeature([unclosedRing])],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/must be closed/i);
    }
  });

  it("accepts a MultiPolygon geometry", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: null,
          geometry: {
            type: "MultiPolygon",
            coordinates: [[validRing]],
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["Point", { type: "Point", coordinates: [28, -25] }],
    [
      "MultiPoint",
      {
        type: "MultiPoint",
        coordinates: [
          [28, -25],
          [28.1, -25.1],
        ],
      },
    ],
    [
      "LineString",
      {
        type: "LineString",
        coordinates: [
          [28, -25],
          [28.1, -25.1],
        ],
      },
    ],
    [
      "MultiLineString",
      {
        type: "MultiLineString",
        coordinates: [
          [
            [28, -25],
            [28.1, -25.1],
          ],
        ],
      },
    ],
  ])("accepts a %s geometry", (_label, geometry) => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry }],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a null geometry", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: null }],
    });

    expect(result.success).toBe(true);
  });
});

describe("townshipFeatureCollectionSchema", () => {
  it("rejects a non-polygon geometry, unlike the generic feature collection schema", () => {
    const result = townshipFeatureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "1",
            name: "Example",
            commuteMinutes: 10,
            nearestJobCenter: "cbd",
            distanceKm: 1,
          },
          geometry: { type: "Point", coordinates: [28, -25] },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("createFeatureCollectionParser", () => {
  it("truncates the error message to the first 3 issues", () => {
    const parse = createFeatureCollectionParser(
      featureCollectionSchema,
      "/data/broken.geojson",
    );

    const brokenFeature = { type: "Feature" };
    const input = {
      type: "FeatureCollection",
      features: [brokenFeature, brokenFeature, brokenFeature, brokenFeature],
    };

    let thrown: unknown;
    try {
      parse(input);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message.split("; ")).toHaveLength(3);
    expect(message).not.toMatch(/features\.3\./);
  });
});
