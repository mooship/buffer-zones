import type { Feature, MultiPolygon, Polygon } from "geojson";

export interface TownshipProperties {
  id: string;
  name: string;
  population?: number;
  commuteMinutes: number | null;
  nearestJobCenter: string;
  distanceKm: number | null;
  unemploymentRatePercent: number | null;
  nearestGautrainStationKm: number | null;
  nearestAReYengStopKm: number | null;
}

export type TownshipFeature = Feature<
  Polygon | MultiPolygon,
  TownshipProperties
>;
