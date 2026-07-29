import { truncate } from "@turf/turf";
import type { FeatureCollection, Geometry } from "geojson";

// Transit line/point features come straight from Overpass at full float64
// precision with every original OSM vertex, which for busy routes (many
// stops/segments digitized over years) is far more detail than is visible on
// a township map — e.g. Gautrain Bus's raw file was ~900KB. Unlike the
// township polygons, there's no shared-edge topology to preserve here, so a
// plain coordinate-precision truncation (same ~11cm precision already used
// for townships in displayTownships.ts) is enough to shrink the payload
// without any visible quality loss, and works uniformly across the mixed
// Point/LineString geometries these collections contain.
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
