import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";
import * as turf from "@turf/turf";
import type { Point } from "geojson";
import type { LatLon } from "./adapters/boundaries";

// Pure transform: for each centroid, finds the straight-line distance (km)
// to the nearest real Gautrain station point in the normalized Overpass
// feature collection (the `railway=station` nodes, not the rail line
// geometry). Returns null for every centroid if no station points were
// fetched, rather than fabricating a distance.
export function computeNearestGautrainStationKm(
  centroids: LatLon[],
  gautrain: TransitLayerFeatureCollection,
): (number | null)[] {
  const stations = gautrain.features
    .map((feature) => feature.geometry)
    .filter((geometry): geometry is Point => geometry.type === "Point");
  if (stations.length === 0) {
    return centroids.map(() => null);
  }

  return centroids.map((centroid) => {
    const point = turf.point([centroid.lon, centroid.lat]);
    let nearestKm = Number.POSITIVE_INFINITY;
    for (const station of stations) {
      const distance = turf.distance(point, turf.point(station.coordinates), {
        units: "kilometers",
      });
      if (distance < nearestKm) {
        nearestKm = distance;
      }
    }
    return nearestKm;
  });
}
