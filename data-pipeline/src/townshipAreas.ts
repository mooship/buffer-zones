import { TOWNSHIP_GROUPS, getTownshipGroup } from "@buffer-zones/shared";
import * as turf from "@turf/turf";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { NormalizedTownship } from "./adapters/boundaries";

interface TownshipAreaProperties {
  name: string;
}

export function createTownshipAreas(
  townships: NormalizedTownship[],
): FeatureCollection<Polygon | MultiPolygon, TownshipAreaProperties> {
  const features = TOWNSHIP_GROUPS.flatMap((name) => {
    const polygons = townships
      .filter(
        (township) => getTownshipGroup(township.name, township.id) === name,
      )
      .map((township) => turf.feature(township.geometry));
    if (polygons.length === 0) {
      return [];
    }

    const dissolved = turf.union(turf.featureCollection(polygons));
    if (!dissolved) {
      return [];
    }

    return [{ ...dissolved, properties: { name } }];
  });

  return { type: "FeatureCollection", features };
}
