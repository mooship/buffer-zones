import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TownshipFeature } from "@buffer-zones/shared";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { createDisplayPolygons } from "./displayTownships";
import { writeGeoJsonFile } from "./export";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../packages/web/public/data");

async function main() {
  const readCollection = async <Properties extends object>(name: string) =>
    JSON.parse(
      await readFile(resolve(DATA_DIR, name), "utf8"),
    ) as FeatureCollection<Polygon | MultiPolygon, Properties>;
  const source = await readCollection<TownshipFeature["properties"]>(
    "townships.v1.geojson",
  );
  const areas = await readCollection<Record<string, unknown>>(
    "township-areas.v1.geojson",
  );
  await writeGeoJsonFile(
    resolve(DATA_DIR, "townships.display.v1.geojson"),
    createDisplayPolygons(source),
    { compact: true },
  );
  await writeGeoJsonFile(
    resolve(DATA_DIR, "township-areas.display.v1.geojson"),
    createDisplayPolygons(areas),
    { compact: true },
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
