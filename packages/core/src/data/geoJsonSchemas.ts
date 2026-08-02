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

/**
 * Zod schema for a GeoJSON `Polygon` geometry.
 * @remarks Each ring must have at least 4 positions and its first and last
 *   position must match (closed ring).
 */
export const polygonGeometrySchema = z.looseObject({
  type: z.literal("Polygon"),
  coordinates: polygonCoordinatesSchema,
});

/**
 * Zod schema for a GeoJSON `MultiPolygon` geometry.
 * @remarks Each constituent polygon is validated by the same closed-ring
 *   rule as {@link polygonGeometrySchema}.
 */
export const multiPolygonGeometrySchema = z.looseObject({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(polygonCoordinatesSchema).check(z.minLength(1)),
});

/**
 * Zod schema for a GeoJSON geometry, including `null` and (recursively)
 * `GeometryCollection`.
 */
const geometrySchema: z.ZodMiniType<unknown> = z.union([
  z.null(),
  z.looseObject({ type: z.literal("Point"), coordinates: positionSchema }),
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
  z.looseObject({
    type: z.literal("GeometryCollection"),
    geometries: z.array(z.lazy(() => geometrySchema)),
  }),
]);

const propertiesSchema = z.union([z.null(), z.record(z.string(), z.unknown())]);

/**
 * Generic Zod schema for a GeoJSON `FeatureCollection`, accepting any
 * geometry type (including `null`) and arbitrary feature properties.
 */
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

/** A function that parses arbitrary `input` into a validated `FeatureCollection`, throwing on failure. */
export type FeatureCollectionParser = (input: unknown) => FeatureCollection;

/**
 * The minimal Zod-compatible schema shape required by
 * {@link createFeatureCollectionParser}.
 */
export interface FeatureCollectionSchema {
  safeParse(input: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: {
          issues: readonly { path: readonly PropertyKey[]; message: string }[];
        };
      };
}

/**
 * Creates a typed parser for a GeoJSON FeatureCollection.
 * @param schema - A Zod-compatible schema with a `safeParse` method.
 * @param url - The source URL, included in error messages for debugging.
 * @returns A function that parses `input` and throws on failure.
 * @remarks Error messages are truncated to the first 3 validation issues.
 * @example
 * const parse = createFeatureCollectionParser(townshipFeatureCollectionSchema, url);
 * const data = parse(await response.json());
 */
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
