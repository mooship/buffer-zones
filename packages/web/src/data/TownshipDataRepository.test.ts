import { afterEach, describe, expect, it, vi } from "vitest";
import { createTownshipDataRepository } from "./TownshipDataRepository";

describe("createTownshipDataRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the given URL and returns the parsed features array", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { id: "A" }, geometry: null }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => geojson }),
    );

    const repo = createTownshipDataRepository("/data/townships.v1.geojson");
    const result = await repo.getTownships();

    expect(fetch).toHaveBeenCalledWith("/data/townships.v1.geojson");
    expect(result).toEqual(geojson.features);
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

  it("returns an empty array when the payload has no features", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "FeatureCollection" }),
      }),
    );

    const repo = createTownshipDataRepository("/data/townships.v1.geojson");

    await expect(repo.getTownships()).resolves.toEqual([]);
  });
});
