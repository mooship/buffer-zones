import {
  getTownshipAreaDefinition,
  TOWNSHIP_AREA_DEFINITIONS,
  type TownshipAreaLabelPriority,
  type TownshipAreaSelectionBasis,
} from "@stratum/app";
import * as turf from "@turf/turf";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { NormalizedTownship } from "./adapters/boundaries";

interface TownshipAreaProperties {
  id: string;
  name: string;
  labelPriority: TownshipAreaLabelPriority;
  labelOffset?: [number, number];
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
    /* v8 ignore next 3 -- unreachable with well-formed input; turf.union only returns null for a degenerate (self-cancelling) collection, which valid township polygons never produce */
    if (!dissolved) {
      return [];
    }

    const labelOffset: [number, number] | undefined = definition.labelOffset
      ? [definition.labelOffset[0], definition.labelOffset[1]]
      : undefined;

    return [
      {
        ...dissolved,
        properties: {
          id: definition.id,
          name: definition.name,
          labelPriority: definition.labelPriority,
          labelOffset,
          selectionBasis: definition.selectionBasis,
          subPlaceCount: members.length,
        },
      },
    ];
  });

  return { type: "FeatureCollection", features };
}
