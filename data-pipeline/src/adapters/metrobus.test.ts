import { afterEach, describe, expect, it, vi } from "vitest";
import type { OverpassResponse } from "./gautrain";
import { normalizeMetrobusOverpass } from "./metrobus";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeMetrobusOverpass", () => {
  it("normalizes way members of a Metrobus relation and deduplicates shared members", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 1001,
          tags: {
            name: "Metrobus C3",
            network: "Metrobus",
            route: "bus",
            ref: "C3",
          },
          members: [
            {
              type: "way",
              ref: 77,
              geometry: [
                { lat: -26.2, lon: 28.02 },
                { lat: -26.21, lon: 28.03 },
              ],
            },
            {
              type: "way",
              ref: 77,
              geometry: [
                { lat: -26.2, lon: 28.02 },
                { lat: -26.21, lon: 28.03 },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeMetrobusOverpass(raw);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "relation/1001",
      name: "Metrobus C3",
      network: "Metrobus",
    });
  });

  it("ignores relation members without geometry or of a non-way type", () => {
    const raw: OverpassResponse = {
      elements: [
        {
          type: "relation" as const,
          id: 1002,
          tags: { network: "Metrobus", route: "bus", ref: "M1" },
          members: [
            { type: "node", ref: 5 },
            { type: "way", ref: 6, geometry: undefined },
          ],
        },
      ],
    };

    const result = normalizeMetrobusOverpass(raw);

    expect(result.features).toHaveLength(0);
  });
});

describe("fetchMetrobusRoutes", () => {
  it("returns an empty collection if Overpass fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchMetrobusRoutes } = await import("./metrobus");
    const result = await fetchMetrobusRoutes("-26.4,27.8,-25.9,28.3");

    expect(result).toEqual({ elements: [] });
  });
});
