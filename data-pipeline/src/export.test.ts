import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { writeGeoJsonFile } from "./export";

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe("writeGeoJsonFile", () => {
  it("creates the parent directory and writes pretty-printed JSON", async () => {
    await writeGeoJsonFile("/out/foo.geojson", {
      type: "FeatureCollection",
      features: [],
    });

    expect(mkdir).toHaveBeenCalledWith("/out", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "/out/foo.geojson",
      JSON.stringify({ type: "FeatureCollection", features: [] }, null, 2),
    );
  });

  it("writes compact JSON for browser display artifacts", async () => {
    const data = { type: "FeatureCollection", features: [] };
    await writeGeoJsonFile("/out/display.geojson", data, { compact: true });

    expect(writeFile).toHaveBeenCalledWith(
      "/out/display.geojson",
      JSON.stringify(data),
    );
  });
});
