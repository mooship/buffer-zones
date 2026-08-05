import type { TransitLayerFeatureCollection } from "@stratum/app";
import { nearestFeatureDistance } from "@stratum/core";
import type { LineString, Point } from "geojson";
import type { LatLon } from "./adapters/boundaries";

/**
 * For each centroid, finds the straight-line distance (km) to the nearest
 * formal transit feature across all given networks.
 * @remarks Pure transform. Uses the real station/stop `Point` where one was
 *   fetched (Gautrain rail, PRASA), and falls back to the nearest point
 *   along the route `LineString` where only route geometry is available
 *   (Gautrain Bus, A Re Yeng) — never a fabricated or averaged number.
 *   Returns `null` for every centroid if no transit features were fetched at all.
 */
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

  return centroids.map((centroid) =>
    nearestFeatureDistance([centroid.lon, centroid.lat], geometries),
  );
}
