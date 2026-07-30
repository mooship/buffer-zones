import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchEkurhuleniIrptnRoutes,
  normalizeEkurhuleniIrptn,
} from "./ekurhuleniIrptn";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeEkurhuleniIrptn", () => {
  it("normalizes LineString and MultiLineString features into transit line features", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { OBJECTID: 1, Name: "Route 1A" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.2, -26.0],
              [28.21, -26.01],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: { OBJECTID: 2, Name: "Route 1B" },
          geometry: {
            type: "MultiLineString" as const,
            coordinates: [
              [
                [28.3, -26.1],
                [28.31, -26.11],
              ],
              [
                [28.32, -26.12],
                [28.33, -26.13],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeEkurhuleniIrptn(raw);

    expect(result.features).toHaveLength(3);
    expect(result.features[0]?.properties).toEqual({
      id: "1",
      name: "Route 1A",
      network: "Ekurhuleni IRPTN",
    });
    expect(result.features[1]?.properties.id).toBe("2");
    expect(result.features[2]?.properties.id).toBe("2");
  });

  it("falls back to default id and name when expected properties are missing", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [28.2, -26.0],
              [28.21, -26.01],
            ],
          },
        },
      ],
    };

    const result = normalizeEkurhuleniIrptn(raw);

    expect(result.features[0]?.properties).toEqual({
      id: "unknown",
      name: "Unnamed",
      network: "Ekurhuleni IRPTN",
    });
  });

  it("skips features that are not line geometries", () => {
    const raw = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { OBJECTID: 1, Name: "Stop" },
          geometry: {
            type: "Point" as const,
            coordinates: [28.2, -26.0],
          },
        },
      ],
    };

    const result = normalizeEkurhuleniIrptn(raw);

    expect(result.features).toHaveLength(0);
  });
});

describe("fetchEkurhuleniIrptnRoutes", () => {
  it("fetches and merges all paged ArcGIS responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { OBJECTID: 1, Name: "Route 1A" },
              geometry: {
                type: "LineString",
                coordinates: [
                  [28.2, -26.0],
                  [28.21, -26.01],
                ],
              },
            },
          ],
          exceededTransferLimit: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { OBJECTID: 2, Name: "Route 1B" },
              geometry: {
                type: "LineString",
                coordinates: [
                  [28.3, -26.1],
                  [28.31, -26.11],
                ],
              },
            },
          ],
          exceededTransferLimit: false,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEkurhuleniIrptnRoutes();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.features).toHaveLength(2);
  });
});
