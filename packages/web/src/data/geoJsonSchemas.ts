import { multiPolygonGeometrySchema, polygonGeometrySchema } from "@karta/core";
import * as z from "zod/mini";

const townshipGeometrySchema = z.union([
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
]);

const townshipPropertiesSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  population: z.optional(z.number()),
  commuteMinutes: z.nullable(z.number()),
  nearestJobCenter: z.string(),
  distanceKm: z.nullable(z.number()),
  nearestTransitKm: z.optional(z.nullable(z.number())),
});

/**
 * Validates a township choropleth `FeatureCollection`, extending
 * `@karta/core`'s generic `featureCollectionSchema` with the specific
 * properties `TownshipProperties` requires (see `@karta/app`).
 */
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
