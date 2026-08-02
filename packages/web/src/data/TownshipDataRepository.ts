import type { TownshipFeature } from "@stratum/app";
import { fetchFeatureCollection } from "@stratum/core";
import { townshipFeatureCollectionSchema } from "./geoJsonSchemas";

export interface TownshipDataRepository {
  getTownships(): Promise<TownshipFeature[]>;
}

class FetchTownshipDataRepository implements TownshipDataRepository {
  constructor(private readonly dataUrl: string) {}

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

export function createTownshipDataRepository(
  dataUrl: string,
): TownshipDataRepository {
  return new FetchTownshipDataRepository(dataUrl);
}
