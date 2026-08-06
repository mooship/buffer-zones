import type { FeatureCollection, Position } from "geojson";
import * as z from "zod/mini";

/**
 * Whether `value` is a GeoJSON position: an array of at least two numbers.
 * @remarks Hand-written rather than expressed as `z.array(z.number())` — see
 *   the note on {@link positionSchema} for why the coordinate interior of a
 *   geometry is validated by plain predicates instead of nested Zod schemas.
 */
function isPosition(value: unknown): value is Position {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }
  for (const coordinate of value) {
    if (typeof coordinate !== "number") {
      return false;
    }
  }
  return true;
}

/** Whether `value` is an array of at least `minimumLength` valid positions. */
function isPositionArray(value: unknown, minimumLength: number): boolean {
  if (!Array.isArray(value) || value.length < minimumLength) {
    return false;
  }
  for (const position of value) {
    if (!isPosition(position)) {
      return false;
    }
  }
  return true;
}

/** Whether a linear ring's first and last positions are identical. */
function isClosedRing(value: Position[]): boolean {
  const first = value[0];
  const last = value.at(-1);
  return (
    first !== undefined &&
    last !== undefined &&
    first.length === last.length &&
    first.every((coordinate, index) => coordinate === last[index])
  );
}

/** Whether `value` is a Polygon's coordinates: at least one closed linear ring. */
function isPolygonCoordinates(value: unknown): value is Position[][] {
  if (!Array.isArray(value) || value.length < 1) {
    return false;
  }
  for (const ring of value) {
    if (!isPositionArray(ring, 4)) {
      return false;
    }
  }
  return true;
}

/**
 * Zod schema for a GeoJSON position.
 * @remarks Validated by a plain predicate wrapped in `z.custom` rather than
 *   `z.array(z.number())`. The check is identical, but Zod's per-element
 *   machinery (a schema node, a result object and an issue path per
 *   coordinate) is not free at GeoJSON's scale: the reference app's default
 *   choropleth alone carries ~100,000 positions, where the nested-schema
 *   form cost ~500ms of blocking main-thread time on a mid-range mobile CPU
 *   for what is ultimately a pair of `typeof` checks. Every geometry schema
 *   below therefore hands its coordinate interior to one of these
 *   predicates and keeps Zod for the parts whose structure actually varies.
 */
const positionSchema = z.custom<Position>(isPosition, {
  message: "Invalid GeoJSON position",
});
const lineStringCoordinatesSchema = z.custom<Position[]>(
  (value) => isPositionArray(value, 2),
  { message: "Invalid GeoJSON position array" },
);
const multiLineStringCoordinatesSchema = z.custom<Position[][]>(
  (value) =>
    Array.isArray(value) && value.every((line) => isPositionArray(line, 2)),
  { message: "Invalid GeoJSON position array" },
);
const polygonCoordinatesSchema = z
  .custom<Position[][]>(isPolygonCoordinates, {
    message: "Invalid GeoJSON polygon coordinates",
  })
  .check(
    z.refine((rings) => rings.every(isClosedRing), {
      message: "Polygon rings must be closed",
    }),
  );
const multiPolygonCoordinatesSchema = z
  .custom<Position[][][]>(
    (value) =>
      Array.isArray(value) &&
      value.length >= 1 &&
      value.every(isPolygonCoordinates),
    { message: "Invalid GeoJSON polygon coordinates" },
  )
  .check(
    z.refine(
      (polygons) => polygons.every((rings) => rings.every(isClosedRing)),
      { message: "Polygon rings must be closed" },
    ),
  );

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
  coordinates: multiPolygonCoordinatesSchema,
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
    coordinates: multiLineStringCoordinatesSchema,
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
 *   `schema` can be `featureCollectionSchema` itself, or a caller's own
 *   stricter schema built on top of it (e.g. one requiring specific feature
 *   properties for a particular domain).
 * @example
 * const parse = createFeatureCollectionParser(featureCollectionSchema, url);
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
