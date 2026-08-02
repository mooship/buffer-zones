import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeGautrainBusOverpass,
  normalizeGautrainOverpass,
} from "./gautrain";

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

  it("skips relation elements", () => {
    const raw = {
      elements: [
        {
          type: "relation" as const,
          id: 1,
          tags: { name: "Some route" },
          members: [],
        },
      ],
    };

    const result = normalizeGautrainOverpass(raw);

    expect(result.features).toHaveLength(0);
  });

  it("falls back to 'Unnamed' when the name tag is absent", () => {
    const raw = {
      elements: [
        {
          type: "way" as const,
          id: 111,
          tags: { railway: "rail" },
          geometry: [
            { lat: -25.75, lon: 28.23 },
            { lat: -25.746, lon: 28.188 },
          ],
        },
      ],
    };

    const result = normalizeGautrainOverpass(raw);

    expect(result.features[0]?.properties.name).toBe("Unnamed");
  });
});

describe("normalizeGautrainBusOverpass", () => {
  it("normalizes way members of a Gautrain bus route relation", () => {
    const result = normalizeGautrainBusOverpass({
      elements: [
        {
          type: "relation",
          id: 42,
          tags: { name: "Pretoria - CBD", ref: "P3" },
          members: [
            {
              type: "way",
              ref: 100,
              geometry: [
                { lat: -25.75, lon: 28.19 },
                { lat: -25.76, lon: 28.21 },
              ],
            },
            {
              type: "way",
              ref: 100,
              geometry: [
                { lat: -25.75, lon: 28.19 },
                { lat: -25.76, lon: 28.21 },
              ],
            },
          ],
        },
      ],
    });

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({
      id: "relation/42",
      name: "Pretoria - CBD",
      network: "Gautrain Bus",
    });
  });
});

describe("fetchOverpass", () => {
  let freshFetchOverpass: typeof import("./gautrain").fetchOverpass;

  beforeEach(async () => {
    vi.resetModules();
    ({ fetchOverpass: freshFetchOverpass } = await import("./gautrain"));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("retries once on HTTP 504 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 504 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = freshFetchOverpass("query");
    await vi.advanceTimersByTimeAsync(3000);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ elements: [] });
  });

  it("rotates to a different public Overpass mirror on repeated failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = freshFetchOverpass("query");
    await vi.advanceTimersByTimeAsync(3000);
    await resultPromise;

    const urlsCalled = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(new Set(urlsCalled).size).toBe(2);
  });

  it("retries after a network error (TypeError) then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = freshFetchOverpass("query");
    await vi.advanceTimersByTimeAsync(3000);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ elements: [] });
  });

  it("aborts the in-flight request once the request timeout elapses", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveFetch: (value: unknown) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init: { signal: AbortSignal }) => {
        capturedSignal = init.signal;
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = freshFetchOverpass("query");
    await vi.advanceTimersByTimeAsync(45_000);

    expect(capturedSignal?.aborted).toBe(true);

    resolveFetch({ ok: true, json: async () => ({ elements: [] }) });
    const result = await resultPromise;

    expect(result).toEqual({ elements: [] });
  });

  it("falls back to a cached response on a non-retryable failure", async () => {
    vi.stubEnv("VITEST", "false");
    const dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-gautrain-"));
    vi.stubEnv("PIPELINE_CACHE_DIR", dir);
    vi.stubEnv("PIPELINE_CACHE", "");

    const { hashKey, writeJsonCache } = await import("../cache");
    const cached = { elements: [] };
    await writeJsonCache("overpass", hashKey(["overpass", "query"]), cached);

    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await freshFetchOverpass("query");

    expect(result).toEqual(cached);
    vi.unstubAllEnvs();
  });

  it("throws a timeout error when the final retry attempt is aborted", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    await expect(freshFetchOverpass("query", 6)).rejects.toThrow(
      /timed out after/,
    );
  });
});

describe("fetchGautrainRail / fetchGautrainBusRoutes", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and returns the raw Overpass response for Gautrain rail", async () => {
    const raw = { elements: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => raw });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchGautrainRail } = await import("./gautrain");
    const result = await fetchGautrainRail("-25.9,28.0,-25.5,28.4");

    expect(result).toEqual(raw);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches and returns the raw Overpass response for Gautrain Bus", async () => {
    const raw = { elements: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => raw });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchGautrainBusRoutes } = await import("./gautrain");
    const result = await fetchGautrainBusRoutes("-25.9,28.0,-25.5,28.4");

    expect(result).toEqual(raw);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("fetchOverpass with no Overpass endpoints configured", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../constants/serviceUrls", () => ({
      getOverpassUrls: () => [],
    }));
  });

  afterEach(() => {
    vi.doUnmock("../constants/serviceUrls");
  });

  it("throws instead of attempting a request", async () => {
    const { fetchOverpass: freshFetchOverpass } = await import("./gautrain");

    await expect(freshFetchOverpass("query")).rejects.toThrow(
      "No Overpass endpoints are configured",
    );
  });
});
