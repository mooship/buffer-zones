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

  it("evicts the least-recently-used entry once the cache exceeds its max size", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = Array.from({ length: 51 }, (_, i) => `/data/lru-${i}.geojson`);
    for (const url of urls) {
      await fetchFeatureCollection(url);
    }

    fetchMock.mockClear();
    await fetchFeatureCollection(urls[0] as string);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    await fetchFeatureCollection(urls[urls.length - 1] as string);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("protects a recently-read entry from eviction by marking it most-recently-used", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeatureCollection("/data/protected.geojson");
    for (let i = 0; i < 48; i++) {
      await fetchFeatureCollection(`/data/fill-${i}.geojson`);
    }
    // Cache now holds 49 entries; "protected" is the least recently used.
    await fetchFeatureCollection("/data/protected.geojson"); // cache hit, touches it
    await fetchFeatureCollection("/data/fill-48.geojson"); // 50th entry, cache at max
    await fetchFeatureCollection("/data/fill-49.geojson"); // 51st entry, evicts the LRU one

    fetchMock.mockClear();
    await fetchFeatureCollection("/data/protected.geojson");
    expect(fetchMock).not.toHaveBeenCalled();

    await fetchFeatureCollection("/data/fill-0.geojson");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
