import type { FeatureCollection } from "geojson";
import * as z from "zod/mini";

const positionSchema = z.array(z.number()).check(z.minLength(2));
const lineStringCoordinatesSchema = z
  .array(positionSchema)
  .check(z.minLength(2));
const linearRingSchema = z.array(positionSchema).check(
  z.minLength(4),
  z.refine(
    (positions) => {
      const first = positions[0];
      const last = positions.at(-1);
      return (
        first !== undefined &&
        last !== undefined &&
        first.length === last.length &&
        first.every((coordinate, index) => coordinate === last[index])
      );
    },
    { message: "Polygon rings must be closed" },
  ),
);
const polygonCoordinatesSchema = z
  .array(linearRingSchema)
  .check(z.minLength(1));

const polygonGeometrySchema = z.looseObject({
  type: z.literal("Polygon"),
  coordinates: polygonCoordinatesSchema,
});

const multiPolygonGeometrySchema = z.looseObject({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(polygonCoordinatesSchema).check(z.minLength(1)),
});

const geometrySchema = z.union([
  z.null(),
  z.looseObject({
    type: z.literal("Point"),
    coordinates: positionSchema,
  }),
  z.looseObject({
    type: z.literal("MultiPoint"),
    coordinates: lineStringCoordinatesSchema,
  }),
  z.looseObject({
    type: z.literal("LineString"),
    coordinates: lineStringCoordinatesSchema,
  }),
  z.looseObject({
    type: z.literal("MultiLineString"),
    coordinates: z.array(lineStringCoordinatesSchema),
  }),
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

const townshipGeometrySchema = z.union([
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

const propertiesSchema = z.union([z.null(), z.record(z.string(), z.unknown())]);

export const featureCollectionSchema = z.looseObject({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.looseObject({
      type: z.literal("Feature"),
      properties: propertiesSchema,
      geometry: geometrySchema,
    }),
  ),
});

const townshipPropertiesSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  population: z.optional(z.number()),
  commuteMinutes: z.nullable(z.number()),
  nearestJobCenter: z.string(),
  distanceKm: z.nullable(z.number()),
  unemploymentRatePercent: z.nullable(z.number()),
  nearestGautrainStationKm: z.nullable(z.number()),
  nearestAReYengStopKm: z.nullable(z.number()),
});

export const townshipFeatureCollectionSchema = z.looseObject({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.looseObject({
      type: z.literal("Feature"),
      properties: townshipPropertiesSchema,
      geometry: townshipGeometrySchema,
    }),
  ),
});

export type FeatureCollectionParser = (input: unknown) => FeatureCollection;

export interface FeatureCollectionSchema {
  safeParse(input: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: {
          issues: readonly {
            path: readonly PropertyKey[];
            message: string;
          }[];
        };
      };
}

export function createFeatureCollectionParser(
  schema: FeatureCollectionSchema,
  url: string,
): FeatureCollectionParser {
  return (input) => {
    const result = schema.safeParse(input);
    if (result.success) {
      return result.data as FeatureCollection;
    }
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid GeoJSON from ${url}: ${issues}`);
  };
}
