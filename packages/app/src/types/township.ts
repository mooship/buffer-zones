import type { Feature, MultiPolygon, Polygon } from "geojson";

/** Per-feature properties for a recognised township's choropleth polygon. */
export interface TownshipProperties {
  id: string;
  name: string;
  /** The area's population, if known. */
  population?: number;
  /** Modelled car drive-time (minutes) to `nearestJobCenter`, or `null` if it couldn't be computed. */
  commuteMinutes: number | null;
  /** Name of the nearest selected job centre `commuteMinutes` is measured to. Empty string if `commuteMinutes` is `null`. */
  nearestJobCenter: string;
  /**
   * Straight-line distance (km) to `nearestJobCenter`.
   * @remarks Currently always `null` — the data pipeline only computes
   *   `commuteMinutes` today, though `TownshipPopup` already renders this
   *   field when present.
   */
  distanceKm: number | null;
  /** Straight-line distance (km) to the nearest formal transit route, or `null` if it couldn't be computed. */
  nearestTransitKm: number | null;
}

/** A recognised township area, as a Polygon/MultiPolygon GeoJSON feature. */
export type TownshipFeature = Feature<
  Polygon | MultiPolygon,
  TownshipProperties
>;
