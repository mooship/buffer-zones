import type { Feature, MultiPolygon, Polygon } from "geojson";

export interface TownshipProperties {
  id: string;
  name: string;
  population?: number;
  commuteMinutes: number | null;
  nearestJobCenter: string;
  distanceKm: number | null;
  nearestTransitKm: number | null;
}

export type TownshipFeature = Feature<
  Polygon | MultiPolygon,
  TownshipProperties
>;
