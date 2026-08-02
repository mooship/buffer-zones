import { afterEach, describe, expect, it, vi } from "vitest";
import type { OverpassResponse } from "./gautrain";
import { normalizeReaVayaOverpass } from "./reaVaya";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeReaVayaOverpass", () => {
  it("normalizes way members of a Rea Vaya route relation into LineString features, deduplicating shared members", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 4511530,
          tags: {
            name: "BRT T1: Ellis Park East => Thokoza Park",
            network: "Rea Vaya",
            route: "bus",
            ref: "T1",
          },
          members: [
            {
              type: "way",
              ref: 100,
              geometry: [
                { lat: -26.257, lon: 27.9 },
                { lat: -26.204, lon: 28.047 },
              ],
            },
            {
              type: "way",
              ref: 100,
              geometry: [
                { lat: -26.257, lon: 27.9 },
                { lat: -26.204, lon: 28.047 },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeReaVayaOverpass(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "relation/4511530",
      name: "BRT T1: Ellis Park East => Thokoza Park",
      network: "Rea Vaya",
    });
    expect(result.features[0]?.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [27.9, -26.257],
        [28.047, -26.204],
      ],
    });
  });

  it("ignores relation members without geometry or of a non-way type", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 1,
          tags: { network: "Rea Vaya", route: "bus" },
          members: [
            { type: "node", ref: 5 },
            { type: "way", ref: 6, geometry: undefined },
          ],
        },
      ],
    };

    const result = normalizeReaVayaOverpass(raw);

    expect(result.features).toHaveLength(0);
  });
});

describe("fetchReaVayaRoutes", () => {
  it("queries Overpass for Rea Vaya bus routes within the given bbox", async () => {
    const raw: OverpassResponse = { elements: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => raw });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchReaVayaRoutes } = await import("./reaVaya");
    const result = await fetchReaVayaRoutes("-26.55,27.65,-25.85,28.35");

    expect(result).toEqual(raw);
    const body = fetchMock.mock.calls[0]?.[1]?.body as string;
    expect(decodeURIComponent(body)).toMatch(/network"~"Rea Vaya"/);
  });
});
