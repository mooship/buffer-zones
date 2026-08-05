import * as turf from "@turf/turf";
import type { LineString, Point, Position } from "geojson";

/**
 * Finds the straight-line distance (kilometres) from `origin` to the nearest
 * of `geometries`.
 * @param origin - The point to measure from, as a `[lon, lat]` position.
 * @param geometries - Candidate `Point` or `LineString` geometries. A
 *   `LineString` is measured to its nearest point along the line, not just
 *   its vertices, so a route geometry isn't penalised for having sparse points.
 * @returns The minimum distance in kilometres, or `null` if `geometries` is empty.
 */
export function nearestFeatureDistance(
  origin: Position,
  geometries: readonly (Point | LineString)[],
): number | null {
  if (geometries.length === 0) {
    return null;
  }

  const point = turf.point(origin);
  let nearestKm = Number.POSITIVE_INFINITY;

  for (const geometry of geometries) {
    const distance =
      geometry.type === "Point"
        ? turf.distance(point, turf.point(geometry.coordinates), {
            units: "kilometers",
          })
        : turf.pointToLineDistance(
            point,
            turf.lineString(geometry.coordinates),
            {
              units: "kilometers",
            },
          );
    if (distance < nearestKm) {
      nearestKm = distance;
    }
  }

  return nearestKm;
}
