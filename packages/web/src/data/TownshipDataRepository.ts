import type { TownshipFeature } from "@stratum/app";
import { fetchFeatureCollection } from "@stratum/core";
import { townshipFeatureCollectionSchema } from "./geoJsonSchemas";

/** Fetches a region's validated township choropleth features. */
export interface TownshipDataRepository {
  getTownships(): Promise<TownshipFeature[]>;
}

class FetchTownshipDataRepository implements TownshipDataRepository {
  constructor(private readonly dataUrl: string) {}

  /**
   * Fetches and validates `dataUrl`, normalising `nearestTransitKm` to
   * `null` when the source data omits the (schema-optional) field entirely.
   */
  async getTownships(): Promise<TownshipFeature[]> {
    const collection = await fetchFeatureCollection(
      this.dataUrl,
      townshipFeatureCollectionSchema,
    );
    /* v8 ignore next -- unreachable: townshipFeatureCollectionSchema requires a features array, so a validated collection always has one */
    const features = (collection.features ?? []) as TownshipFeature[];
    return features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        nearestTransitKm: feature.properties.nearestTransitKm ?? null,
      },
    }));
  }
}

/** Creates a `TownshipDataRepository` that fetches from `dataUrl`. */
export function createTownshipDataRepository(
  dataUrl: string,
): TownshipDataRepository {
  return new FetchTownshipDataRepository(dataUrl);
}
