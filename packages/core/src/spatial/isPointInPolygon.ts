import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

/**
 * Tests whether `point` falls within `polygon`.
 * @param point - The point to test, as a `[lon, lat]` position.
 * @param polygon - A `Polygon`/`MultiPolygon` geometry, or a `Feature` wrapping one.
 * @returns `true` if `point` is inside (or on the boundary of) `polygon`.
 */
export function isPointInPolygon(
  point: Position,
  polygon: Polygon | MultiPolygon | Feature<Polygon | MultiPolygon>,
): boolean {
  const geometry = polygon.type === "Feature" ? polygon.geometry : polygon;
  return turf.booleanPointInPolygon(turf.point(point), geometry);
}
