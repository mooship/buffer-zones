import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { FeatureCollection, Polygon } from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  rebuildTownshipDisplay,
  rebuildTransitDisplay,
} from "./buildDisplayData";

const townships: FeatureCollection<Polygon, { id: string; name: string }> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "west", name: "West" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

const townshipAreas: FeatureCollection<Polygon, Record<string, unknown>> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

const transitLine: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "1", name: "Route 1", network: "Test" },
      geometry: {
        type: "LineString",
        coordinates: [
          [27.9, -26.257],
          [28.0, -26.2],
        ],
      },
    },
  ],
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-display-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("rebuildTownshipDisplay", () => {
  it("rebuilds both display files from the plain .v1.geojson fallback and returns true", async () => {
    await writeFile(
      resolve(dir, "townships.v1.geojson"),
      JSON.stringify(townships),
    );
    await writeFile(
      resolve(dir, "township-areas.v1.geojson"),
      JSON.stringify(townshipAreas),
    );

    const result = await rebuildTownshipDisplay(dir);

    expect(result).toBe(true);
    const rebuiltTownships = JSON.parse(
      await readFile(resolve(dir, "townships.display.v1.geojson"), "utf8"),
    );
    expect(rebuiltTownships.features[0].properties.id).toBe("west");
    const rebuiltAreas = JSON.parse(
      await readFile(resolve(dir, "township-areas.display.v1.geojson"), "utf8"),
    );
    expect(rebuiltAreas.type).toBe("FeatureCollection");
  });

  it("prefers the .display.v1.geojson source over the plain fallback", async () => {
    await writeFile(
      resolve(dir, "townships.display.v1.geojson"),
      JSON.stringify(townships),
    );
    await writeFile(
      resolve(dir, "township-areas.display.v1.geojson"),
      JSON.stringify(townshipAreas),
    );

    const result = await rebuildTownshipDisplay(dir);

    expect(result).toBe(true);
  });

  it("returns false when no township source file exists", async () => {
    const result = await rebuildTownshipDisplay(dir);

    expect(result).toBe(false);
  });
});

describe("rebuildTransitDisplay", () => {
  it("rebuilds a display file from the plain .v1.geojson fallback", async () => {
    await writeFile(
      resolve(dir, "gautrain.v1.geojson"),
      JSON.stringify(transitLine),
    );

    await rebuildTransitDisplay(dir, "tshwane");

    const rebuilt = JSON.parse(
      await readFile(resolve(dir, "gautrain.display.v1.geojson"), "utf8"),
    );
    expect(rebuilt.features[0].properties.name).toBe("Route 1");
  });

  it("skips an operator with no source file at all, without throwing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      rebuildTransitDisplay(dir, "tshwane"),
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("no source file"),
    );
    logSpy.mockRestore();
  });
});
