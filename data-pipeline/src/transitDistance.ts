import type { TransitLayerFeatureCollection } from "@stratum/shared";
import * as turf from "@turf/turf";
import type { LineString, Point } from "geojson";
import type { LatLon } from "./adapters/boundaries";

// Pure transform: for each centroid, finds the straight-line distance (km)
// to the nearest formal transit feature across all given networks. Uses the
// real station/stop Point where one was fetched (Gautrain rail, PRASA), and
// falls back to the nearest point along the route LineString where only
// route geometry is available (Gautrain Bus, A Re Yeng) — never a fabricated
// or averaged number. Returns null for every centroid if no transit features
// were fetched at all.
export function computeNearestTransitKm(
  centroids: LatLon[],
  transitCollections: TransitLayerFeatureCollection[],
): (number | null)[] {
  const geometries = transitCollections
    .flatMap((collection) => collection.features)
    .map((feature) => feature.geometry)
    .filter(
      (geometry): geometry is Point | LineString =>
        geometry.type === "Point" || geometry.type === "LineString",
    );
  if (geometries.length === 0) {
    return centroids.map(() => null);
  }

  return centroids.map((centroid) => {
    const point = turf.point([centroid.lon, centroid.lat]);
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
  });
}
