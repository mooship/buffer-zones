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
   * @remarks A feature that already carries the field is passed through
   *   as-is rather than rebuilt. The published data sets it on every
   *   feature, so cloning each one to write back a value it already had cost
   *   two throwaway objects per feature — thousands of allocations, and the
   *   garbage collection that follows, on the main thread while the map is
   *   trying to become interactive.
   */
  async getTownships(): Promise<TownshipFeature[]> {
    const collection = await fetchFeatureCollection(
      this.dataUrl,
      townshipFeatureCollectionSchema,
    );
    /* v8 ignore next -- unreachable: townshipFeatureCollectionSchema requires a features array, so a validated collection always has one */
    const features = (collection.features ?? []) as TownshipFeature[];
    return features.map((feature) =>
      feature.properties.nearestTransitKm === undefined
        ? {
            ...feature,
            properties: { ...feature.properties, nearestTransitKm: null },
          }
        : feature,
    );
  }
}

/** Creates a `TownshipDataRepository` that fetches from `dataUrl`. */
export function createTownshipDataRepository(
  dataUrl: string,
): TownshipDataRepository {
  return new FetchTownshipDataRepository(dataUrl);
}
