import { describe, expect, it } from "vitest";
import {
  createFeatureCollectionParser,
  featureCollectionSchema,
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

  it("rejects a polygon ring with fewer than four positions", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        polygonFeature([
          [
            [28, -25],
            [28.1, -25],
            [28, -25],
          ],
        ]),
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric coordinate nested inside a polygon ring", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        polygonFeature([
          [
            [28, -25],
            ["28.1", -25] as unknown as number[],
            [28.1, -25.1],
            [28, -25],
          ],
        ]),
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a polygon with no rings at all", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [polygonFeature([])],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a MultiPolygon whose ring is not closed", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [28, -25],
                  [28.1, -25],
                  [28.1, -25.1],
                  [28, -25.05],
                ],
              ],
            ],
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a MultiLineString containing a single-position line", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiLineString",
            coordinates: [[[28, -25]]],
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts positions carrying an elevation as a third coordinate", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [28, -25, 1450] },
        },
      ],
    });

    expect(result.success).toBe(true);
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

  it("accepts a GeometryCollection containing multiple geometry types", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "GeometryCollection",
            geometries: [
              { type: "Point", coordinates: [28, -25] },
              {
                type: "LineString",
                coordinates: [
                  [28, -25],
                  [28.1, -25.1],
                ],
              },
            ],
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a GeometryCollection with no geometries", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "GeometryCollection", geometries: [] },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a GeometryCollection containing an invalid geometry", () => {
    const result = featureCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "GeometryCollection",
            geometries: [{ type: "Point", coordinates: [28] }],
          },
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

  it("labels a root-level issue as 'root' instead of an empty path", () => {
    const parse = createFeatureCollectionParser(
      featureCollectionSchema,
      "/data/broken.geojson",
    );

    let thrown: unknown;
    try {
      parse(null);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/root:/);
  });
});
