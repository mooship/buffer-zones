import { clearFeatureCollectionCache } from "@stratum/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTownshipDataRepository } from "./TownshipDataRepository";

describe("createTownshipDataRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearFeatureCollectionCache();
  });

  it("fetches the given URL and returns the parsed features array", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "A",
            name: "Mamelodi",
            commuteMinutes: 20,
            nearestJobCenter: "Pretoria CBD",
            distanceKm: null,
            nearestTransitKm: null,
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [28, -25],
                [28.1, -25],
                [28.1, -25.1],
                [28, -25],
              ],
            ],
          },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => geojson }),
    );

    const repo = createTownshipDataRepository("/data/townships.v1.geojson");
    const result = await repo.getTownships();

    expect(fetch).toHaveBeenCalledWith(
      "/data/townships.v1.geojson",
      expect.objectContaining({ signal: undefined }),
    );
    expect(result).toEqual(geojson.features);
  });

  it("keeps an existing numeric nearestTransitKm value instead of the null fallback", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "A",
            name: "Mamelodi",
            commuteMinutes: 20,
            nearestJobCenter: "Pretoria CBD",
            distanceKm: null,
            nearestTransitKm: 1.5,
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [28, -25],
                [28.1, -25],
                [28.1, -25.1],
                [28, -25],
              ],
            ],
          },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => geojson }),
    );

    const repo = createTownshipDataRepository("/data/townships.v1.geojson");
    const result = await repo.getTownships();

    expect(result[0]?.properties.nearestTransitKm).toBe(1.5);
  });

  it("throws a descriptive error when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const repo = createTownshipDataRepository("/data/missing.geojson");

    await expect(repo.getTownships()).rejects.toThrow(
      "Failed to load /data/missing.geojson: 404",
    );
  });

  it("rejects township features with invalid evidence properties", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                id: "A",
                name: "Mamelodi",
                commuteMinutes: "twenty",
              },
              geometry: null,
            },
          ],
        }),
      }),
    );

    const repo = createTownshipDataRepository("/data/townships.geojson");
    await expect(repo.getTownships()).rejects.toThrow(
      /invalid geojson.*commuteMinutes/i,
    );
  });

  it("rejects township features with non-polygon geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                id: "A",
                name: "Mamelodi",
                commuteMinutes: 20,
                nearestJobCenter: "Pretoria CBD",
                distanceKm: null,
                nearestTransitKm: null,
              },
              geometry: { type: "Point", coordinates: [28, -25] },
            },
          ],
        }),
      }),
    );

    const repo = createTownshipDataRepository("/data/townships.geojson");
    await expect(repo.getTownships()).rejects.toThrow(/geometry/i);
  });

  it("rejects a payload with no features array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "FeatureCollection" }),
      }),
    );

    const repo = createTownshipDataRepository("/data/townships.v1.geojson");

    await expect(repo.getTownships()).rejects.toThrow(
      /invalid geojson.*features/i,
    );
  });
});
