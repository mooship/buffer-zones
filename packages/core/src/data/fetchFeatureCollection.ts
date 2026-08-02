import type { FeatureCollection } from "geojson";
import {
  createFeatureCollectionParser,
  type FeatureCollectionSchema,
  featureCollectionSchema,
} from "./geoJsonSchemas";

const cache = new Map<string, FeatureCollection>();

/**
 * Clears the in-memory cache used by `fetchFeatureCollection`.
 * @remarks Data sources are static, versioned GeoJSON files with no runtime
 *   invalidation, so this exists for tests rather than app-level use.
 */
export function clearFeatureCollectionCache(): void {
  cache.clear();
}

/**
 * Fetches a GeoJSON FeatureCollection from `url` and validates it against `schema`.
 * @param url - The URL to fetch from.
 * @param schema - Zod-compatible schema. Defaults to the generic `featureCollectionSchema`.
 * @param signal - Optional `AbortSignal` to cancel the request.
 * @returns A validated `FeatureCollection`.
 * @remarks Throws `Error` on a non-2xx HTTP response (with status code) or on
 *   schema parse failure (with URL and up to 3 issue paths). A successful
 *   result is cached in-memory by `url` for the lifetime of the page, so a
 *   layer toggled off and back on isn't re-fetched over the network. Failed
 *   requests are not cached, so a later call can retry.
 */
export async function fetchFeatureCollection(
  url: string,
  schema: FeatureCollectionSchema = featureCollectionSchema,
  signal?: AbortSignal,
): Promise<FeatureCollection> {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  const data = createFeatureCollectionParser(
    schema,
    url,
  )(await response.json());
  cache.set(url, data);
  return data;
}
