import { truncate } from "@turf/turf";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import type { Objects, Topology } from "topojson-specification";
import { GEOJSON_COORDINATE_PRECISION } from "./constants/geoJson";

const MINIMUM_TRIANGLE_WEIGHT = 3e-8;
// ~11cm at the equator - far finer than anything visible on a township map,
// but cuts several redundant digits off every coordinate in the payload.

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
