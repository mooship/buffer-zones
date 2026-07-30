import { afterEach, describe, expect, it, vi } from "vitest";
import type { OverpassResponse } from "./gautrain";
import { normalizeTshwaneBusOverpass } from "./tshwaneBus";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeTshwaneBusOverpass", () => {
  it("normalizes way members of a Tshwane bus relation and deduplicates shared members", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 2001,
          tags: {
            name: "TBS 3",
            network: "Tshwane Bus Services",
            route: "bus",
            ref: "3",
          },
          members: [
            {
              type: "way",
              ref: 88,
              geometry: [
                { lat: -25.72, lon: 28.12 },
                { lat: -25.73, lon: 28.14 },
              ],
            },
            {
              type: "way",
              ref: 88,
              geometry: [
                { lat: -25.72, lon: 28.12 },
                { lat: -25.73, lon: 28.14 },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeTshwaneBusOverpass(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "relation/2001",
      name: "TBS 3",
      network: "Tshwane Bus Services",
    });
  });

  it("ignores relation members without geometry or of a non-way type", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 2002,
          tags: { network: "Tshwane Bus Services", route: "bus", ref: "5" },
          members: [
            { type: "node", ref: 5 },
            { type: "way", ref: 6, geometry: undefined },
          ],
        },
      ],
    };

    const result = normalizeTshwaneBusOverpass(raw);

    expect(result.features).toHaveLength(0);
  });
});

describe("fetchTshwaneBusRoutes", () => {
  it("returns an empty collection if Overpass fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchTshwaneBusRoutes } = await import("./tshwaneBus");
    const result = await fetchTshwaneBusRoutes("-25.9,28.0,-25.5,28.4");

    expect(result).toEqual({ elements: [] });
  });
});
