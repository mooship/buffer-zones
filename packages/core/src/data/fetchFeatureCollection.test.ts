import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFeatureCollectionCache,
  fetchFeatureCollection,
} from "./fetchFeatureCollection";

describe("fetchFeatureCollection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearFeatureCollectionCache();
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

  it("caches a successful fetch and does not re-request the same URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeatureCollection("/data/cached.geojson");
    await fetchFeatureCollection("/data/cached.geojson");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches independently for different URLs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeatureCollection("/data/a.geojson");
    await fetchFeatureCollection("/data/b.geojson");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed fetch, so a later call can retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "FeatureCollection", features: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFeatureCollection("/data/retry.geojson"),
    ).rejects.toThrow();
    await expect(
      fetchFeatureCollection("/data/retry.geojson"),
    ).resolves.toMatchObject({ type: "FeatureCollection" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearFeatureCollectionCache forces the next call to re-fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeatureCollection("/data/cached.geojson");
    clearFeatureCollectionCache();
    await fetchFeatureCollection("/data/cached.geojson");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
