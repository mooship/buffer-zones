import { afterEach, describe, expect, it, vi } from "vitest";
import type { OverpassResponse } from "./gautrain";
import { normalizePrasaOverpass } from "./prasa";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("falls back to 'Unnamed' when the name tag is absent", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "way" as const,
          id: 1,
          tags: { railway: "rail", operator: "PRASA" },
          geometry: [
            { lat: -25.746, lon: 28.188 },
            { lat: -25.708, lon: 28.343 },
          ],
        },
      ],
    };

    const result = normalizePrasaOverpass(raw);

    expect(result.features[0]?.properties.name).toBe("Unnamed");
  });

  it("skips elements that are neither 'way' nor 'node'", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 2,
          tags: { railway: "rail" },
          members: [],
        },
      ],
    };

    const result = normalizePrasaOverpass(raw);

    expect(result.features).toHaveLength(0);
  });
});

describe("fetchPrasaRail", () => {
  it("queries Overpass for PRASA/Metrorail rail routes within the given bbox", async () => {
    const raw: OverpassResponse = { elements: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => raw });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchPrasaRail } = await import("./prasa");
    const result = await fetchPrasaRail("-26.55,27.65,-25.85,28.35");

    expect(result).toEqual(raw);
    const body = fetchMock.mock.calls[0]?.[1]?.body as string;
    expect(decodeURIComponent(body)).toMatch(/operator"~"PRASA\|Metrorail"/);
  });
});
