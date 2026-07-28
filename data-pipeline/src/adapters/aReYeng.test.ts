import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAReYengRoutes,
  normalizeAReYeng,
  normalizeAReYengOverpass,
} from "./aReYeng";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeAReYeng", () => {
  it("normalizes a raw open-data-portal route feature into the common TransitLayer shape", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            ROUTE_ID: "ARY-1",
            ROUTE_NAME: "Pretoria CBD - Menlyn",
          },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.19, -25.75],
              [28.28, -25.78],
            ],
          },
        },
      ],
    };

    const result = normalizeAReYeng(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "ARY-1",
      name: "Pretoria CBD - Menlyn",
      network: "A Re Yeng",
    });
  });

  it("normalizes a real Tshwane open-data-portal feature (ArcGIS field names, MultiLineString geometry)", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            OBJECTID: 7,
            Route_Type: "Trunk Route",
            Route_Code: "Line 1A",
            Route_Description: "CBD_Wonderboom",
            Label: "T1",
          },
          geometry: {
            type: "MultiLineString" as const,
            coordinates: [
              [
                [28.19, -25.75],
                [28.2, -25.76],
              ],
              [
                [28.21, -25.77],
                [28.28, -25.78],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeAReYeng(raw);

    // MultiLineString splits into one LineString feature per part, sharing the same route id.
    expect(result.features).toHaveLength(2);
    expect(result.features[0]?.properties).toEqual({
      id: "7",
      name: "Line 1A",
      network: "A Re Yeng",
    });
    expect(result.features[0]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [28.19, -25.75],
        [28.2, -25.76],
      ],
    });
    expect(result.features[1]?.properties.id).toBe("7");
    expect(result.features[1]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [28.21, -25.77],
        [28.28, -25.78],
      ],
    });
  });
});

describe("normalizeAReYengOverpass", () => {
  it("normalizes an OSM-tagged fallback way into the common TransitLayer shape", () => {
    const raw = {
      elements: [
        {
          type: "way" as const,
          id: 333,
          tags: { highway: "busway", network: "A Re Yeng", name: "Line 1A" },
          geometry: [
            { lat: -25.75, lon: 28.19 },
            { lat: -25.78, lon: 28.28 },
          ],
        },
      ],
    };

    const result = normalizeAReYengOverpass(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "way/333",
      name: "Line 1A",
      network: "A Re Yeng",
    });
  });
});

describe("fetchAReYengRoutes", () => {
  it("fetches the trunk, complementary, and feeder layers and merges their features", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const layer = url.includes("/8/query")
        ? "8"
        : url.includes("/9/query")
          ? "9"
          : "10";
      return Promise.resolve({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { OBJECTID: layer, Route_Code: `Line ${layer}` },
              geometry: {
                type: "LineString",
                coordinates: [
                  [28.19, -25.75],
                  [28.2, -25.76],
                ],
              },
            },
          ],
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAReYengRoutes();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/8/query"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/9/query"));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/10/query"),
    );
    expect("features" in result && result.features).toHaveLength(3);
  });

  it("falls back to Overpass if any of the three layers fails to fetch", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("overpass-api.de")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ elements: [] }),
        });
      }
      if (url.includes("/9/query")) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ type: "FeatureCollection", features: [] }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAReYengRoutes();

    expect("elements" in result).toBe(true);
  });
});
