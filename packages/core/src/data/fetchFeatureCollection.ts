import type { FeatureCollection } from "geojson";
import {
  createFeatureCollectionParser,
  type FeatureCollectionSchema,
  featureCollectionSchema,
} from "./geoJsonSchemas";

/**
 * Fetches a GeoJSON FeatureCollection from `url` and validates it against `schema`.
 * @param url - The URL to fetch from.
 * @param schema - Zod-compatible schema. Defaults to the generic `featureCollectionSchema`.
 * @param signal - Optional `AbortSignal` to cancel the request.
 * @returns A validated `FeatureCollection`.
 * @remarks Throws `Error` on a non-2xx HTTP response (with status code) or on
 *   schema parse failure (with URL and up to 3 issue paths).
 */
export async function fetchFeatureCollection(
  url: string,
  schema: FeatureCollectionSchema = featureCollectionSchema,
  signal?: AbortSignal,
): Promise<FeatureCollection> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return createFeatureCollectionParser(schema, url)(await response.json());
}
