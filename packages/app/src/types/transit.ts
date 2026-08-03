import type { Feature, FeatureCollection, LineString, Point } from "geojson";

/** Per-feature properties shared by transit route and stop/station features. */
export interface TransitStop {
  id: string;
  name: string;
  /** The transit operator or line this feature belongs to (e.g. "Rapid Rail", "A Re Yeng"). */
  network: string;
}

/** A single transit route, as a LineString GeoJSON feature. */
export type TransitLineFeature = Feature<LineString, TransitStop>;
/** A single transit stop or station, as a Point GeoJSON feature. */
export type TransitStopFeature = Feature<Point, TransitStop>;
/** A transit layer's data: a mix of route (LineString) and, for layers with `hasPointGeometry`, stop/station (Point) features. */
export type TransitLayerFeatureCollection = FeatureCollection<
  LineString | Point,
  TransitStop
>;
