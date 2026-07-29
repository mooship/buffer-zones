import { truncate } from "@turf/turf";
import type { FeatureCollection, Geometry } from "geojson";

// Unlike townships, transit lines have no shared-edge topology to preserve,
// so plain coordinate truncation (same precision as displayTownships.ts) is
// enough to shrink full-float64 Overpass output without visible quality loss.
const COORDINATE_PRECISION = 6;

export function createDisplayTransit<Properties extends object>(
  source: FeatureCollection<Geometry, Properties>,
): FeatureCollection<Geometry, Properties> {
  return truncate(source, {
    precision: COORDINATE_PRECISION,
    coordinates: 2,
    mutate: false,
  }) as FeatureCollection<Geometry, Properties>;
}
