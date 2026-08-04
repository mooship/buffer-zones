import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { normalizeLineStringTransitFeatureCollection } from "./lineStringTransit";

interface RawProps {
  code?: string;
  label?: string;
}

function resolveStop(props: RawProps) {
  return { id: props.code ?? "unknown", name: props.label ?? "Unnamed" };
}

describe("normalizeLineStringTransitFeatureCollection", () => {
  it("splits a MultiLineString into one feature per part", () => {
    const raw: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { code: "R1", label: "Route 1" },
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [27.9, -26.257],
                [28.0, -26.2],
              ],
              [
                [28.1, -26.1],
                [28.2, -26.0],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeLineStringTransitFeatureCollection(
      raw,
      resolveStop,
      "Test Network",
    );

    expect(result.features).toHaveLength(2);
    expect(result.features[0]?.properties).toEqual({
      id: "R1",
      name: "Route 1",
      network: "Test Network",
    });
    expect(result.features[1]?.properties).toEqual({
      id: "R1",
      name: "Route 1",
      network: "Test Network",
    });
  });

  it("normalizes a LineString into a single feature", () => {
    const raw: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { code: "R2" },
          geometry: {
            type: "LineString",
            coordinates: [
              [27.9, -26.257],
              [28.0, -26.2],
            ],
          },
        },
      ],
    };

    const result = normalizeLineStringTransitFeatureCollection(
      raw,
      resolveStop,
      "Test Network",
    );

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [27.9, -26.257],
        [28.0, -26.2],
      ],
    });
    expect(result.features[0]?.properties.name).toBe("Unnamed");
  });

  it("skips features whose geometry is not a LineString or MultiLineString", () => {
    const raw: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [27.9, -26.257] },
        },
      ],
    };

    const result = normalizeLineStringTransitFeatureCollection(
      raw,
      resolveStop,
      "Test Network",
    );

    expect(result.features).toHaveLength(0);
  });
});
