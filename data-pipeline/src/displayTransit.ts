import { truncate } from "@turf/turf";
import type { FeatureCollection, Geometry } from "geojson";
import { GEOJSON_COORDINATE_PRECISION } from "./constants/geoJson";

/**
 * Builds a coordinate-truncated copy of a transit `FeatureCollection` for
 * display.
 * @remarks Unlike `createDisplayPolygons`, transit lines have no shared-edge
 *   topology to preserve, so plain coordinate truncation (same precision) is
 *   enough to shrink full-float64 Overpass output without visible quality loss.
 */
export function createDisplayTransit<Properties extends object>(
  source: FeatureCollection<Geometry, Properties>,
): FeatureCollection<Geometry, Properties> {
  return truncate(source, {
    precision: GEOJSON_COORDINATE_PRECISION,
    coordinates: 2,
    mutate: false,
  }) as FeatureCollection<Geometry, Properties>;
}
