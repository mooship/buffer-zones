import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METROS,
  type TownshipFeature,
  TRANSIT_OPERATOR_LAYER_NAMES,
  type TransitLayerFeatureCollection,
} from "@stratum/app";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { createDisplayPolygons } from "./displayTownships";
import { createDisplayTransit } from "./displayTransit";
import { writeGeoJsonFile } from "./export";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, "../../packages/web/public/data");

async function readPolygonCollection<Properties extends object>(
  dataDir: string,
  name: string,
): Promise<FeatureCollection<Polygon | MultiPolygon, Properties>> {
  return JSON.parse(
    await readFile(resolve(dataDir, name), "utf8"),
  ) as FeatureCollection<Polygon | MultiPolygon, Properties>;
}

async function rebuildTownshipDisplay(dataDir: string): Promise<boolean> {
  try {
    const source = await readPolygonCollection<TownshipFeature["properties"]>(
      dataDir,
      "townships.display.v1.geojson",
    ).catch(async () => {
      return readPolygonCollection<TownshipFeature["properties"]>(
        dataDir,
        "townships.v1.geojson",
      );
    });
    const areas = await readPolygonCollection<Record<string, unknown>>(
      dataDir,
      "township-areas.display.v1.geojson",
    ).catch(async () => {
      return readPolygonCollection<Record<string, unknown>>(
        dataDir,
        "township-areas.v1.geojson",
      );
    });
    await writeGeoJsonFile(
      resolve(dataDir, "townships.display.v1.geojson"),
      createDisplayPolygons(source),
      { compact: true },
    );
    await writeGeoJsonFile(
      resolve(dataDir, "township-areas.display.v1.geojson"),
      createDisplayPolygons(areas),
      { compact: true },
    );
    return true;
  } catch {
    return false;
  }
}

async function rebuildTransitDisplay(
  dataDir: string,
  metroId: string,
): Promise<void> {
  for (const name of TRANSIT_OPERATOR_LAYER_NAMES) {
    try {
      const collection = JSON.parse(
        await readFile(resolve(dataDir, `${name}.display.v1.geojson`), "utf8"),
      ) as TransitLayerFeatureCollection;
      await writeGeoJsonFile(
        resolve(dataDir, `${name}.display.v1.geojson`),
        createDisplayTransit(collection),
        { compact: true },
      );
    } catch {
      try {
        const collection = JSON.parse(
          await readFile(resolve(dataDir, `${name}.v1.geojson`), "utf8"),
        ) as TransitLayerFeatureCollection;
        await writeGeoJsonFile(
          resolve(dataDir, `${name}.display.v1.geojson`),
          createDisplayTransit(collection),
          { compact: true },
        );
      } catch {
        console.log(`  skipping ${metroId}/${name} (no source file)`);
      }
    }
  }
}

async function main() {
  for (const metro of METROS) {
    const dataDir = resolve(DATA_ROOT, metro.id);
    const hasTownships = await rebuildTownshipDisplay(dataDir);
    if (!hasTownships) {
      console.log(`  skipping ${metro.id} townships (no source file yet)`);
      continue;
    }
    await rebuildTransitDisplay(dataDir, metro.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
