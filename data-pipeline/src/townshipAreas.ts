import {
  TOWNSHIP_AREA_DEFINITIONS,
  type TownshipAreaLabelPriority,
  type TownshipAreaSelectionBasis,
  getTownshipAreaDefinition,
} from "@buffer-zones/shared";
import * as turf from "@turf/turf";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { NormalizedTownship } from "./adapters/boundaries";

interface TownshipAreaProperties {
  id: string;
  name: string;
  labelPriority: TownshipAreaLabelPriority;
  selectionBasis: TownshipAreaSelectionBasis;
  subPlaceCount: number;
}

export function createTownshipAreas(
  townships: NormalizedTownship[],
): FeatureCollection<Polygon | MultiPolygon, TownshipAreaProperties> {
  const features = TOWNSHIP_AREA_DEFINITIONS.flatMap((definition) => {
    const members = townships.filter(
      (township) =>
        getTownshipAreaDefinition(township.name, township.id)?.id ===
        definition.id,
    );
    const polygons = members.map((township) => turf.feature(township.geometry));
    if (polygons.length === 0) {
      return [];
    }

    const dissolved =
      polygons.length === 1
        ? polygons[0]
        : turf.union(turf.featureCollection(polygons));
    if (!dissolved) {
      return [];
    }

    return [
      {
        ...dissolved,
        properties: {
          id: definition.id,
          name: definition.name,
          labelPriority: definition.labelPriority,
          selectionBasis: definition.selectionBasis,
          subPlaceCount: members.length,
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}
