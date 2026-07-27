import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export interface TransitStop {
  id: string;
  name: string;
  network: string;
}

export type TransitLineFeature = Feature<LineString, TransitStop>;
export type TransitStopFeature = Feature<Point, TransitStop>;
export type TransitLayerFeatureCollection = FeatureCollection<
  LineString | Point,
  TransitStop
>;
