import type { FeatureCollection, Geometry } from "geojson";
import { describe, expect, it } from "vitest";
import {
  reprojectFeatureCollection,
  reprojectGeometry,
  reprojectPosition,
} from "./reproject";

const HARTEBEESTHOEK94_LO29 =
  "+proj=tmerc +axis=wsu +lat_0=0 +lon_0=29 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs";

const SOURCE_COORD: [number, number] = [1000000, 1000000];
const REPROJECTED_COORD: [number, number] = [
  8.983152841195215, 8.946573850543412,
];

describe("reprojectPosition", () => {
  it("reprojects a Web Mercator (EPSG:3857) origin to WGS84 (0, 0)", () => {
    expect(reprojectPosition([0, 0], "EPSG:3857")).toEqual([0, 0]);
  });

  it("reprojects a Hartebeesthoek94 / Lo29 position to its known WGS84 equivalent", () => {
    const [lon, lat] = reprojectPosition(
      [-79123.34118003, -2848942.531846167],
      HARTEBEESTHOEK94_LO29,
    );
    expect(lon).toBeCloseTo(28.2114, 6);
    expect(lat).toBeCloseTo(-25.7461, 6);
  });

  it("preserves a third (elevation) coordinate unchanged", () => {
    const result = reprojectPosition([0, 0, 1620], "EPSG:3857");
    expect(result).toEqual([0, 0, 1620]);
  });
});

describe("reprojectGeometry", () => {
  it.each<[string, Geometry, Geometry]>([
    [
      "Point",
      { type: "Point", coordinates: SOURCE_COORD },
      { type: "Point", coordinates: REPROJECTED_COORD },
    ],
    [
      "MultiPoint",
      { type: "MultiPoint", coordinates: [SOURCE_COORD, SOURCE_COORD] },
      {
        type: "MultiPoint",
        coordinates: [REPROJECTED_COORD, REPROJECTED_COORD],
      },
    ],
    [
      "LineString",
      { type: "LineString", coordinates: [SOURCE_COORD, SOURCE_COORD] },
      {
        type: "LineString",
        coordinates: [REPROJECTED_COORD, REPROJECTED_COORD],
      },
    ],
    [
      "MultiLineString",
      { type: "MultiLineString", coordinates: [[SOURCE_COORD]] },
      { type: "MultiLineString", coordinates: [[REPROJECTED_COORD]] },
    ],
    [
      "Polygon",
      { type: "Polygon", coordinates: [[SOURCE_COORD, SOURCE_COORD]] },
      {
        type: "Polygon",
        coordinates: [[REPROJECTED_COORD, REPROJECTED_COORD]],
      },
    ],
    [
      "MultiPolygon",
      { type: "MultiPolygon", coordinates: [[[SOURCE_COORD]]] },
      { type: "MultiPolygon", coordinates: [[[REPROJECTED_COORD]]] },
    ],
    [
      "GeometryCollection",
      {
        type: "GeometryCollection",
        geometries: [{ type: "Point", coordinates: SOURCE_COORD }],
      },
      {
        type: "GeometryCollection",
        geometries: [{ type: "Point", coordinates: REPROJECTED_COORD }],
      },
    ],
  ])("reprojects every position in a %s", (_name, geometry, expected) => {
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual(expected);
  });

  it("does not mutate the input geometry", () => {
    const geometry: Geometry = { type: "Point", coordinates: SOURCE_COORD };
    reprojectGeometry(geometry, "EPSG:3857");
    expect(geometry).toEqual({ type: "Point", coordinates: SOURCE_COORD });
  });
});

describe("reprojectFeatureCollection", () => {
  it("reprojects every feature's geometry", () => {
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1 },
          geometry: { type: "Point", coordinates: SOURCE_COORD },
        },
      ],
    };

    expect(reprojectFeatureCollection(collection, "EPSG:3857")).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1 },
          geometry: { type: "Point", coordinates: REPROJECTED_COORD },
        },
      ],
    });
  });
});
