import type { Feature, FeatureCollection } from "geojson";

/**
 * Concatenates the features from multiple FeatureCollections into one.
 * @param collections - Collections to merge, in order.
 * @returns A new `FeatureCollection` containing all features.
 */
export function mergeFeatureCollections(
  collections: readonly FeatureCollection[],
): FeatureCollection {
  const features: Feature[] = [];
  for (const collection of collections) {
    features.push(...collection.features);
  }
  return { type: "FeatureCollection", features };
}
