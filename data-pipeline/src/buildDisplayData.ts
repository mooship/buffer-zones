import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METROS,
  type TownshipFeature,
  type TransitLayerFeatureCollection,
} from "@buffer-zones/shared";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { createDisplayPolygons } from "./displayTownships";
import { createDisplayTransit } from "./displayTransit";
import { writeGeoJsonFile } from "./export";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, "../../packages/web/public/data");

// Transit layer base filenames that may exist per metro; not every metro has
// every operator (e.g. only Tshwane has a-re-yeng/gautrain-bus), so each is
// skipped with a friendly log line rather than failing the whole run.
const TRANSIT_LAYER_NAMES = [
  "gautrain",
  "gautrain-bus",
  "prasa",
  "a-re-yeng",
  "rea-vaya",
];

async function main() {
  for (const metro of METROS) {
    const dataDir = resolve(DATA_ROOT, metro.id);
    const readCollection = async <Properties extends object>(name: string) =>
      JSON.parse(
        await readFile(resolve(dataDir, name), "utf8"),
      ) as FeatureCollection<Polygon | MultiPolygon, Properties>;

    try {
      const source = await readCollection<TownshipFeature["properties"]>(
        "townships.v1.geojson",
      );
      const areas = await readCollection<Record<string, unknown>>(
        "township-areas.v1.geojson",
      );
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
    } catch {
      console.log(`  skipping ${metro.id} townships (no source file yet)`);
      continue;
    }

    for (const name of TRANSIT_LAYER_NAMES) {
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
        console.log(`  skipping ${metro.id}/${name} (no source file)`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
