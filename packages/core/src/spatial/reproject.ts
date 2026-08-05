import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import proj4 from "proj4";

/**
 * GeoJSON's mandated coordinate reference system (RFC 7946 §4) — the target
 * every `reproject*` function converts into.
 */
const WGS84 = "WGS84";

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
  const [lon, lat] = proj4(sourceCrs, WGS84).forward([
    position[0],
    position[1],
  ] as [number, number]);
  return position.length > 2 ? [lon, lat, position[2] as number] : [lon, lat];
}

/**
 * Recursively reprojects every position in `geometry` from `sourceCrs` into WGS84.
 * @param geometry - Any GeoJSON geometry, including a nested `GeometryCollection`.
 * @param sourceCrs - A proj4-compatible definition string.
 */
export function reprojectGeometry(
  geometry: Geometry,
  sourceCrs: string,
): Geometry {
  switch (geometry.type) {
    case "Point":
      return {
        ...geometry,
        coordinates: reprojectPosition(geometry.coordinates, sourceCrs),
      };
    case "MultiPoint":
    case "LineString":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((position) =>
          reprojectPosition(position, sourceCrs),
        ),
      };
    case "MultiLineString":
    case "Polygon":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((line) =>
          line.map((position) => reprojectPosition(position, sourceCrs)),
        ),
      };
    case "MultiPolygon":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((polygon) =>
          polygon.map((ring) =>
            ring.map((position) => reprojectPosition(position, sourceCrs)),
          ),
        ),
      };
    case "GeometryCollection":
      return {
        ...geometry,
        geometries: geometry.geometries.map((member) =>
          reprojectGeometry(member, sourceCrs),
        ),
      };
  }
}

/**
 * Reprojects every feature's geometry in `collection` from `sourceCrs` into WGS84.
 * @param collection - The collection to reproject.
 * @param sourceCrs - A proj4-compatible definition string.
 * @remarks Features with a `null` geometry are passed through unchanged.
 */
export function reprojectFeatureCollection<
  G extends Geometry | null = Geometry,
>(collection: FeatureCollection<G>, sourceCrs: string): FeatureCollection<G> {
  return {
    ...collection,
    features: collection.features.map(
      (feature): Feature<G> => ({
        ...feature,
        geometry: (feature.geometry
          ? reprojectGeometry(feature.geometry, sourceCrs)
          : null) as G,
      }),
    ),
  };
}
