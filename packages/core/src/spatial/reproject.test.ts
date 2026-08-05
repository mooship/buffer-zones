import type { FeatureCollection, Geometry } from "geojson";
import { describe, expect, it } from "vitest";
import {
  reprojectFeatureCollection,
  reprojectGeometry,
  reprojectPosition,
} from "./reproject";

const HARTEBEESTHOEK94_LO29 =
  "+proj=tmerc +axis=wsu +lat_0=0 +lon_0=29 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs";

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
  it("reprojects a Point", () => {
    const geometry: Geometry = { type: "Point", coordinates: [0, 0] };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "Point",
      coordinates: [0, 0],
    });
  });

  it("reprojects every position in a MultiPoint", () => {
    const geometry: Geometry = {
      type: "MultiPoint",
      coordinates: [
        [0, 0],
        [0, 0],
      ],
    };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "MultiPoint",
      coordinates: [
        [0, 0],
        [0, 0],
      ],
    });
  });

  it("reprojects every position in a LineString", () => {
    const geometry: Geometry = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [0, 0],
      ],
    };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "LineString",
      coordinates: [
        [0, 0],
        [0, 0],
      ],
    });
  });

  it("reprojects every position in a MultiLineString", () => {
    const geometry: Geometry = {
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [0, 0],
        ],
      ],
    };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [0, 0],
        ],
      ],
    });
  });

  it("reprojects every ring position in a Polygon", () => {
    const geometry: Geometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ],
    };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      ],
    });
  });

  it("reprojects every ring position in a MultiPolygon", () => {
    const geometry: Geometry = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        ],
      ],
    };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        ],
      ],
    });
  });

  it("recursively reprojects every geometry in a GeometryCollection", () => {
    const geometry: Geometry = {
      type: "GeometryCollection",
      geometries: [{ type: "Point", coordinates: [0, 0] }],
    };
    expect(reprojectGeometry(geometry, "EPSG:3857")).toEqual({
      type: "GeometryCollection",
      geometries: [{ type: "Point", coordinates: [0, 0] }],
    });
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
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };

    expect(reprojectFeatureCollection(collection, "EPSG:3857")).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1 },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    });
  });

  it("passes null geometries through unchanged", () => {
    const collection: FeatureCollection<Geometry | null> = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: null, geometry: null }],
    };

    expect(reprojectFeatureCollection(collection, "EPSG:3857")).toEqual(
      collection,
    );
  });
});
