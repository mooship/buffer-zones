import type { TownshipFeature } from "@buffer-zones/shared";

export interface TownshipDataRepository {
  getTownships(): Promise<TownshipFeature[]>;
}

class FetchTownshipDataRepository implements TownshipDataRepository {
  constructor(private readonly dataUrl: string) {}

  async getTownships(): Promise<TownshipFeature[]> {
    const response = await fetch(this.dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${this.dataUrl}: ${response.status}`);
    }
    const geojson = (await response.json()) as {
      features?: TownshipFeature[];
    };
    return geojson.features ?? [];
  }
}

export function createTownshipDataRepository(
  dataUrl: string,
): TownshipDataRepository {
  return new FetchTownshipDataRepository(dataUrl);
}
