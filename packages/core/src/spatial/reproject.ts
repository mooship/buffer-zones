import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import proj4, { type Converter } from "proj4";

/**
 * GeoJSON's mandated coordinate reference system (RFC 7946 §4) — the target
 * every `reproject*` function converts into.
 */
const WGS84 = "WGS84";

/**
 * Applies an already-built proj4 `converter` to a single position.
 * @remarks Shared by `reprojectPosition` (which builds its own converter,
 *   for one-off use) and `reprojectGeometry` (which builds one converter
 *   and reuses it across every coordinate, rather than re-parsing
 *   `sourceCrs` on every position).
 */
function applyConverter(converter: Converter, position: Position): Position {
  const [lon, lat] = converter.forward([position[0], position[1]] as [
    number,
    number,
  ]);
  return position.length > 2 ? [lon, lat, position[2] as number] : [lon, lat];
}

/**
 * Reprojects a single position from `sourceCrs` into WGS84.
 * @param position - A `[x, y]` (or `[x, y, z]`) coordinate in `sourceCrs`.
 * @param sourceCrs - A proj4-compatible definition string (e.g. an `EPSG:*`
 *   code proj4 recognises by default, or a raw `+proj=...` definition).
 * @returns The equivalent `[lon, lat]` (or `[lon, lat, z]`) WGS84 position.
 *   A third elevation coordinate, if present, is carried through unchanged —
 *   horizontal reprojection doesn't affect it.
 */
export function reprojectPosition(
  position: Position,
  sourceCrs: string,
): Position {
  return applyConverter(proj4(sourceCrs, WGS84), position);
}

/**
 * Recursively reprojects every position in `geometry` from `sourceCrs` into WGS84.
 * @param geometry - Any GeoJSON geometry, including a nested `GeometryCollection`.
 * @param sourceCrs - A proj4-compatible definition string.
 * @remarks Walks coordinates via Turf's `coordEach`, so every geometry type
 *   it supports (including `GeometryCollection`) is handled without a
 *   hand-written recursive case per type. Builds one converter for the whole
 *   geometry rather than re-parsing `sourceCrs` per coordinate.
 */
export function reprojectGeometry(
  geometry: Geometry,
  sourceCrs: string,
): Geometry {
  const converter = proj4(sourceCrs, WGS84);
  const reprojected = turf.clone(geometry);
  turf.coordEach(reprojected, (coord) => {
    const [lon, lat] = applyConverter(converter, coord) as [number, number];
    coord[0] = lon;
    coord[1] = lat;
  });
  return reprojected;
}

/**
 * Reprojects every feature's geometry in `collection` from `sourceCrs` into WGS84.
 * @param collection - The collection to reproject.
 * @param sourceCrs - A proj4-compatible definition string.
 */
export function reprojectFeatureCollection(
  collection: FeatureCollection,
  sourceCrs: string,
): FeatureCollection {
  return {
    ...collection,
    features: collection.features.map(
      (feature): Feature => ({
        ...feature,
        geometry: reprojectGeometry(feature.geometry, sourceCrs),
      }),
    ),
  };
}
