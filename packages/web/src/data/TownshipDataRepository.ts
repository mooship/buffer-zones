import type { TownshipFeature } from "@buffer-zones/shared";
import { fetchFeatureCollection } from "./fetchFeatureCollection";
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
    return (collection.features ?? []) as TownshipFeature[];
  }
}

export function createTownshipDataRepository(
  dataUrl: string,
): TownshipDataRepository {
  return new FetchTownshipDataRepository(dataUrl);
}
