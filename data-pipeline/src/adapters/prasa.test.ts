import { describe, expect, it } from "vitest";
import type { OverpassResponse } from "./gautrain";
import { normalizePrasaOverpass } from "./prasa";

describe("normalizePrasaOverpass", () => {
  it("normalizes Overpass 'way' rail elements and 'node' station elements into transit features", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "way" as const,
          id: 333,
          tags: {
            railway: "rail",
            operator: "PRASA",
            name: "Pretoria - Mamelodi Line",
          },
          geometry: [
            { lat: -25.746, lon: 28.188 },
            { lat: -25.708, lon: 28.343 },
          ],
        },
        {
          type: "node" as const,
          id: 444,
          tags: {
            railway: "station",
            network: "Metrorail Gauteng",
            name: "Mamelodi Gardens",
          },
          lat: -25.708,
          lon: 28.343,
        },
      ],
    };

    const result = normalizePrasaOverpass(raw);

    expect(result.features).toHaveLength(2);
    const line = result.features.find((f) => f.geometry.type === "LineString");
    const point = result.features.find((f) => f.geometry.type === "Point");
    expect(line?.properties).toEqual({
      id: "way/333",
      name: "Pretoria - Mamelodi Line",
      network: "PRASA",
    });
    expect(point?.properties.name).toBe("Mamelodi Gardens");
    expect(point?.geometry).toEqual({
      type: "Point",
      coordinates: [28.343, -25.708],
    });
  });
});
