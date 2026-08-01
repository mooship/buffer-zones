import type { FeatureCollection } from "geojson";
import {
  createFeatureCollectionParser,
  type FeatureCollectionSchema,
  featureCollectionSchema,
} from "./geoJsonSchemas";

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
