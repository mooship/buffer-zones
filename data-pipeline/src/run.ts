import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchAReYengRoutes,
  normalizeAReYeng,
  normalizeAReYengOverpass,
} from "./adapters/aReYeng";
import {
  fetchTshwaneBoundaries,
  normalizeBoundaries,
} from "./adapters/boundaries";
import {
  fetchGautrainBusRoutes,
  fetchGautrainRail,
  normalizeGautrainBusOverpass,
  normalizeGautrainOverpass,
} from "./adapters/gautrain";
import { fetchPrasaRail, normalizePrasaOverpass } from "./adapters/prasa";
import { JOB_CENTERS } from "./constants/jobCenters";
import { createDisplayPolygons } from "./displayTownships";
import { writeGeoJsonFile } from "./export";
import { computeNearestGautrainStationKm } from "./gautrainDistance";
import { joinTownshipData } from "./join";
import { getNearestJobCenter } from "./osrmClient";
import { createTownshipAreas } from "./townshipAreas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../packages/web/public/data");

async function main() {
  console.log("Fetching Tshwane sub-place boundaries...");
  const rawBoundaries = await fetchTshwaneBoundaries();
  const townships = normalizeBoundaries(rawBoundaries);
  console.log(`  ${townships.length} sub-places loaded`);

  console.log(
    `Computing drive times to nearest of ${JOB_CENTERS.length} job centers (${JOB_CENTERS.map((c) => c.name).join(", ")}) via public OSRM...`,
  );
  const nearestJobCenters = await getNearestJobCenter(
    townships.map((t) => t.centroid),
    JOB_CENTERS,
  );

  console.log("Fetching Gautrain rail via Overpass...");
  const gautrain = normalizeGautrainOverpass(await fetchGautrainRail());
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "gautrain.v1.geojson"), gautrain);

  const nearestGautrainStationKm = computeNearestGautrainStationKm(
    townships.map((t) => t.centroid),
    gautrain,
  );

  const townshipFeatures = joinTownshipData(
    townships,
    nearestJobCenters,
    nearestGautrainStationKm,
  );
  const townshipCollection = {
    type: "FeatureCollection",
    features: townshipFeatures,
  } as const;
  await writeGeoJsonFile(
    resolve(OUTPUT_DIR, "townships.v1.geojson"),
    townshipCollection,
  );
  await writeGeoJsonFile(
    resolve(OUTPUT_DIR, "townships.display.v1.geojson"),
    createDisplayPolygons(townshipCollection),
    { compact: true },
  );
  const townshipAreas = createTownshipAreas(townships);
  await writeGeoJsonFile(
    resolve(OUTPUT_DIR, "township-areas.v1.geojson"),
    townshipAreas,
  );
  await writeGeoJsonFile(
    resolve(OUTPUT_DIR, "township-areas.display.v1.geojson"),
    createDisplayPolygons(townshipAreas),
    { compact: true },
  );

  console.log("Fetching Gautrain bus routes via Overpass...");
  const gautrainBus = normalizeGautrainBusOverpass(
    await fetchGautrainBusRoutes(),
  );
  await writeGeoJsonFile(
    resolve(OUTPUT_DIR, "gautrain-bus.v1.geojson"),
    gautrainBus,
  );

  console.log("Fetching PRASA rail via Overpass...");
  const prasa = normalizePrasaOverpass(await fetchPrasaRail());
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "prasa.v1.geojson"), prasa);

  console.log("Fetching A Re Yeng routes...");
  const rawAReYeng = await fetchAReYengRoutes();
  const aReYeng =
    "elements" in rawAReYeng
      ? normalizeAReYengOverpass(rawAReYeng)
      : normalizeAReYeng(rawAReYeng);
  await writeGeoJsonFile(resolve(OUTPUT_DIR, "a-re-yeng.v1.geojson"), aReYeng);

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
