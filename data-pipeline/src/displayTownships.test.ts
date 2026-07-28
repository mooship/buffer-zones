import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { area, kinks } from "@turf/turf";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { createDisplayPolygons } from "./displayTownships";

const source: FeatureCollection<Polygon, { id: string; name: string }> = {
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
            [1, 0.5],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "east", name: "East" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [1, 0],
            [2, 0],
            [2, 1],
            [1, 1],
            [1, 0.5],
            [1, 0],
          ],
        ],
      },
    },
  ],
};

describe("createDisplayPolygons", () => {
  it("preserves feature IDs and evidence properties", () => {
    const result = createDisplayPolygons(source);

    expect(result.features.map((feature) => feature.properties)).toEqual(
      source.features.map((feature) => feature.properties),
    );
  });

  it("keeps adjacent polygon borders coincident", () => {
    const result = createDisplayPolygons(source);
    const border = (index: number) =>
      (result.features[index]?.geometry.coordinates[0] ?? [])
        .filter(([longitude]) => longitude === 1)
        .sort((first, second) => (first[1] ?? 0) - (second[1] ?? 0));

    expect(border(0)).toEqual(border(1));
  });

  it("keeps every production feature within one percent area drift", async () => {
    const dataDirectory = resolve(
      import.meta.dirname,
      "../../packages/web/public/data",
    );
    const readCollection = async (name: string) =>
      JSON.parse(
        await readFile(resolve(dataDirectory, name), "utf8"),
      ) as FeatureCollection<Polygon | MultiPolygon, { id: string }>;
    for (const prefix of ["townships", "township-areas"]) {
      const full = await readCollection(`${prefix}.v1.geojson`);
      const display = await readCollection(`${prefix}.display.v1.geojson`);
      const displayById = new Map(
        display.features.map((feature) => [feature.properties.id, feature]),
      );

      expect(displayById.size).toBe(full.features.length);
      for (const sourceFeature of full.features) {
        const displayFeature = displayById.get(sourceFeature.properties.id);
        expect(displayFeature).toBeDefined();
        if (!displayFeature) {
          throw new Error(
            `Missing display feature ${sourceFeature.properties.id}`,
          );
        }
        const sourceArea = area(sourceFeature);
        const areaDrift =
          Math.abs(area(displayFeature) - sourceArea) / sourceArea;
        expect(areaDrift).toBeLessThan(0.01);
      }
    }
  });

  it("does not introduce polygon self-intersections", async () => {
    const dataDirectory = resolve(
      import.meta.dirname,
      "../../packages/web/public/data",
    );
    const readCollection = async (name: string) =>
      JSON.parse(
        await readFile(resolve(dataDirectory, name), "utf8"),
      ) as FeatureCollection<Polygon | MultiPolygon, { id: string }>;

    for (const prefix of ["townships", "township-areas"]) {
      const source = await readCollection(`${prefix}.v1.geojson`);
      const display = await readCollection(`${prefix}.display.v1.geojson`);
      const sourceInvalid = new Set(
        source.features
          .filter((feature) => kinks(feature).features.length > 0)
          .map((feature) => feature.properties.id),
      );
      const introduced = display.features.filter(
        (feature) =>
          !sourceInvalid.has(feature.properties.id) &&
          kinks(feature).features.length > 0,
      );

      expect(introduced).toEqual([]);
    }
  });
});
