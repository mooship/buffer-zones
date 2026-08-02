import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeatureCollection } from "./fetchFeatureCollection";

describe("fetchFeatureCollection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects malformed GeoJSON with the source URL and issue path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "FeatureCollection", features: "invalid" }),
      }),
    );

    await expect(
      fetchFeatureCollection("/data/broken.geojson"),
    ).rejects.toThrow(/invalid geojson.*broken\.geojson.*features/i);
  });
  it("rejects non-numeric geometry coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: ["28", -25] },
            },
          ],
        }),
      }),
    );

    await expect(
      fetchFeatureCollection("/data/broken.geojson"),
    ).rejects.toThrow(/features\.0\.geometry/i);
  });

  it("rejects with the HTTP status on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    await expect(
      fetchFeatureCollection("/data/missing.geojson"),
    ).rejects.toThrow(/missing\.geojson.*404/i);
  });

  it("propagates a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(
      fetchFeatureCollection("/data/unreachable.geojson"),
    ).rejects.toThrow("Failed to fetch");
  });
});
