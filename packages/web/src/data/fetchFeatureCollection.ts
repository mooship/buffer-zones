import type { FeatureCollection } from "geojson";
import {
  type FeatureCollectionSchema,
  createFeatureCollectionParser,
  featureCollectionSchema,
} from "./geoJsonSchemas";

export async function fetchFeatureCollection(
  url: string,
  schema: FeatureCollectionSchema = featureCollectionSchema,
): Promise<FeatureCollection> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return createFeatureCollectionParser(schema, url)(await response.json());
}
