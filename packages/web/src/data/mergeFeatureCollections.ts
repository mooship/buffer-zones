import type { Feature, FeatureCollection } from "geojson";

export function mergeFeatureCollections(
  collections: readonly FeatureCollection[],
): FeatureCollection {
  const features: Feature[] = [];
  for (const collection of collections) {
    features.push(...collection.features);
  }
  return { type: "FeatureCollection", features };
}
