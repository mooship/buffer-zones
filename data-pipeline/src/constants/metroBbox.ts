import type { MetroId } from "@stratum/app";
import { unionBoundingBoxes } from "@stratum/core";
import type { BBox } from "geojson";

/**
 * Each metro's bounding box, as `"south,west,north,east"`.
 * @remarks Generous enough to include Midrand/Ivory Park's Gautrain/PRASA
 *   infrastructure just outside the Johannesburg boundary.
 */
export const METRO_BBOX: Record<MetroId, string> = {
  tshwane: "-25.95,28.05,-25.55,28.40",
  johannesburg: "-26.55,27.65,-25.85,28.35",
  ekurhuleni: "-26.45,28.10,-25.95,28.65",
  emfuleni: "-26.79929,27.56909,-26.41898,28.02492",
  midvaal: "-26.92383,27.86908,-26.33516,28.40685",
  lesedi: "-26.67601,28.17947,-26.17224,28.86129",
  "mogale-city": "-26.21321,27.42522,-25.79592,27.94085",
  "rand-west-city": "-26.61774,27.46589,-26.05110,27.82447",
  "merafong-city": "-26.64947,27.15634,-26.08917,27.62991",
};

/** Returns a metro's bounding box string from `METRO_BBOX`. */
export function getMetroBbox(metroId: MetroId): string {
  return METRO_BBOX[metroId];
}

/**
 * Parses an Overpass-style `"south,west,north,east"` bbox string into the
 * `[minLng, minLat, maxLng, maxLat]` shape `@stratum/core`'s spatial
 * utilities expect.
 */
function parseBbox(box: string): BBox {
  const [south, west, north, east] = box.split(",").map(Number) as [
    number,
    number,
    number,
    number,
  ];
  return [west, south, east, north];
}

/**
 * Returns the union bounding box of every given metro, as `"south,west,north,east"`.
 * @remarks Used to fetch a region-wide transit network (e.g. Gautrain, which
 *   crosses several metros) once as a whole, rather than as metro-clipped
 *   fragments that would look severed at each metro's boundary. Callers
 *   should pass only the metros of the region being built, not every
 *   registered metro, so a build never pulls another region's network into
 *   its own output.
 * @throws If `metroIds` is empty.
 */
export function getSharedTransitBbox(metroIds: readonly MetroId[]): string {
  if (metroIds.length === 0) {
    throw new Error("At least one metro is required to build a shared bbox");
  }
  const [west, south, east, north] = unionBoundingBoxes(
    metroIds.map((metroId) => parseBbox(METRO_BBOX[metroId])),
  );
  return `${south},${west},${north},${east}`;
}
