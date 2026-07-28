import { describe, expect, it, vi } from "vitest";
import { fetchOverpass, normalizeGautrainOverpass } from "./gautrain";

describe("normalizeGautrainOverpass", () => {
  it("normalizes Overpass 'way' rail elements and 'node' station elements into transit features", () => {
    const raw = {
      elements: [
        {
          type: "way" as const,
          id: 111,
          tags: {
            railway: "rail",
            operator: "Gautrain",
            name: "Hatfield - Pretoria Line",
          },
          geometry: [
            { lat: -25.75, lon: 28.23 },
            { lat: -25.746, lon: 28.188 },
          ],
        },
        {
          type: "node" as const,
          id: 222,
          tags: {
            railway: "station",
            operator: "Gautrain",
            name: "Hatfield Station",
          },
          lat: -25.75,
          lon: 28.23,
        },
      ],
    };

    const result = normalizeGautrainOverpass(raw);

    expect(result.features).toHaveLength(2);
    const line = result.features.find((f) => f.geometry.type === "LineString");
    const point = result.features.find((f) => f.geometry.type === "Point");
    expect(line?.properties).toEqual({
      id: "way/111",
      name: "Hatfield - Pretoria Line",
      network: "Gautrain",
    });
    expect(point?.properties.name).toBe("Hatfield Station");
    expect(point?.geometry).toEqual({
      type: "Point",
      coordinates: [28.23, -25.75],
    });
  });
});

describe("fetchOverpass", () => {
  it("retries once on HTTP 504 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 504 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOverpass("https://example.com", "query");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ elements: [] });

    vi.unstubAllGlobals();
  });
});
