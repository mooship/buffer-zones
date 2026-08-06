import { truncate } from "@turf/turf";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import type { Objects, Topology } from "topojson-specification";
import { GEOJSON_COORDINATE_PRECISION } from "./constants/geoJson";

/**
 * Visvalingam triangle-area threshold (in square degrees) below which a
 * vertex is dropped, ~1,200 m² here.
 * @remarks Chosen as the largest value that still leaves every township
 *   recognisable: measured against the published Gauteng dataset it changes
 *   mean feature shape by 0.1%, shrinks no feature's area by more than 15%,
 *   and collapses none of them, while removing ~28% of the vertex count the
 *   browser has to parse, project and rasterise. The next step up (3e-7)
 *   erases small townships such as Alexandra Ext 30 outright, which is why
 *   this isn't tuned purely for payload size.
 */
const MINIMUM_TRIANGLE_WEIGHT = 1e-7;

/**
 * Builds a simplified, coordinate-truncated copy of a township polygon
 * collection for display, via a topology-preserving simplify (so shared
 * borders between adjacent townships stay aligned — a per-feature simplify
 * would drift them apart) followed by coordinate truncation to
 * `GEOJSON_COORDINATE_PRECISION`.
 */
export function createDisplayPolygons<
  Geometry extends Polygon | MultiPolygon,
  Properties extends object,
>(
  source: FeatureCollection<Geometry, Properties>,
): FeatureCollection<Geometry, Properties> {
  const topologyData = topology({ townships: source }) as Topology<
    Objects<Properties>
  >;
  const simplified = simplify(
    presimplify(topologyData),
    MINIMUM_TRIANGLE_WEIGHT,
  );
  const townships = simplified.objects.townships;
  /* v8 ignore next 3 -- unreachable with well-formed input; topology() always produces a "townships" object for the source we pass it */
  if (!townships) {
    throw new Error("Display topology did not contain township geometry");
  }
  const result = feature(simplified, townships) as unknown as FeatureCollection<
    Geometry,
    Properties
  >;
  return truncate(result, {
    precision: GEOJSON_COORDINATE_PRECISION,
    coordinates: 2,
    mutate: true,
  });
}
