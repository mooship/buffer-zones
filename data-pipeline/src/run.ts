import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METROS,
  type MetroId,
  type TransitLayerFeatureCollection,
} from "@buffer-zones/shared";
import {
  fetchAReYengRoutes,
  normalizeAReYeng,
  normalizeAReYengOverpass,
} from "./adapters/aReYeng";
import {
  fetchMetroBoundaries,
  normalizeBoundaries,
} from "./adapters/boundaries";
import {
  fetchGautrainBusRoutes,
  fetchGautrainRail,
  normalizeGautrainBusOverpass,
  normalizeGautrainOverpass,
} from "./adapters/gautrain";
import { fetchPrasaRail, normalizePrasaOverpass } from "./adapters/prasa";
import {
  fetchReaVayaRoutes,
  normalizeReaVayaOverpass,
} from "./adapters/reaVaya";
import { getJobCentersForMetro } from "./constants/jobCenters";
import { getMetroBbox, getSharedTransitBbox } from "./constants/metroBbox";
import { createDisplayPolygons } from "./displayTownships";
import { createDisplayTransit } from "./displayTransit";
import { writeGeoJsonFile } from "./export";
import { joinTownshipData } from "./join";
import { getNearestJobCenter } from "./osrmClient";
import { createTownshipAreas } from "./townshipAreas";
import { computeNearestTransitKm } from "./transitDistance";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

interface SharedTransit {
  gautrain: TransitLayerFeatureCollection;
  gautrainBus: TransitLayerFeatureCollection;
  prasa: TransitLayerFeatureCollection;
}

// Gautrain, Gautrain Bus and PRASA are Gauteng-wide networks, not confined
// to a single metro, so they're fetched once against the union of every
// metro's bbox rather than per metro (which would clip each line at that
// metro's boundary). The resulting collections are written into every
// metro's output directory unchanged, so the same complete, connected
// network renders regardless of which metro is selected in the UI.
async function fetchSharedTransit(): Promise<SharedTransit> {
  const bbox = getSharedTransitBbox();

  console.log("Fetching Gautrain rail via Overpass (Gauteng-wide)...");
  const gautrain = normalizeGautrainOverpass(await fetchGautrainRail(bbox));

  console.log("Fetching PRASA rail via Overpass (Gauteng-wide)...");
  const prasa = normalizePrasaOverpass(await fetchPrasaRail(bbox));

  console.log("Fetching Gautrain bus routes via Overpass (Gauteng-wide)...");
  const gautrainBus = normalizeGautrainBusOverpass(
    await fetchGautrainBusRoutes(bbox),
  );

  return { gautrain, gautrainBus, prasa };
}

async function runMetro(
  metroId: MetroId,
  sharedTransit: SharedTransit,
): Promise<void> {
  const outputDir = resolve(OUTPUT_ROOT, metroId);
  const bbox = getMetroBbox(metroId);
  const jobCenters = getJobCentersForMetro(metroId);

  async function writeTransitLayer(
    name: string,
    collection: TransitLayerFeatureCollection,
  ): Promise<void> {
    await writeGeoJsonFile(
      resolve(outputDir, `${name}.v1.geojson`),
      collection,
    );
    await writeGeoJsonFile(
      resolve(outputDir, `${name}.display.v1.geojson`),
      createDisplayTransit(collection),
      { compact: true },
    );
  }

  console.log(`\n=== ${metroId} ===`);
  console.log(`Fetching ${metroId} sub-place boundaries...`);
  const rawBoundaries = await fetchMetroBoundaries(metroId);
  const townships = normalizeBoundaries(rawBoundaries);
  console.log(`  ${townships.length} sub-places loaded`);

  console.log(
    `Computing drive times to nearest of ${jobCenters.length} job centers (${jobCenters.map((c) => c.name).join(", ")}) via public OSRM...`,
  );
  const nearestJobCenters = await getNearestJobCenter(
    townships.map((t) => t.centroid),
    jobCenters,
  );

  const transitCollections: TransitLayerFeatureCollection[] = [];

  await writeTransitLayer("gautrain", sharedTransit.gautrain);
  transitCollections.push(sharedTransit.gautrain);

  await writeTransitLayer("prasa", sharedTransit.prasa);
  transitCollections.push(sharedTransit.prasa);

  await writeTransitLayer("gautrain-bus", sharedTransit.gautrainBus);
  transitCollections.push(sharedTransit.gautrainBus);

  if (metroId === "tshwane") {
    console.log("Fetching A Re Yeng routes...");
    const rawAReYeng = await fetchAReYengRoutes();
    const aReYeng =
      "elements" in rawAReYeng
        ? normalizeAReYengOverpass(rawAReYeng)
        : normalizeAReYeng(rawAReYeng);
    await writeTransitLayer("a-re-yeng", aReYeng);
    transitCollections.push(aReYeng);
  }

  if (metroId === "johannesburg") {
    console.log("Fetching Rea Vaya routes via Overpass...");
    const reaVaya = normalizeReaVayaOverpass(await fetchReaVayaRoutes(bbox));
    await writeTransitLayer("rea-vaya", reaVaya);
    transitCollections.push(reaVaya);
  }

  const nearestTransitKm = computeNearestTransitKm(
    townships.map((t) => t.centroid),
    transitCollections,
  );

  const townshipFeatures = joinTownshipData(
    townships,
    nearestJobCenters,
    nearestTransitKm,
  );
  const townshipCollection = {
    type: "FeatureCollection",
    features: townshipFeatures,
  } as const;
  await writeGeoJsonFile(
    resolve(outputDir, "townships.v1.geojson"),
    townshipCollection,
  );
  await writeGeoJsonFile(
    resolve(outputDir, "townships.display.v1.geojson"),
    createDisplayPolygons(townshipCollection),
    { compact: true },
  );
  const townshipAreas = createTownshipAreas(townships);
  await writeGeoJsonFile(
    resolve(outputDir, "township-areas.v1.geojson"),
    townshipAreas,
  );
  await writeGeoJsonFile(
    resolve(outputDir, "township-areas.display.v1.geojson"),
    createDisplayPolygons(townshipAreas),
    { compact: true },
  );

  console.log(`Done with ${metroId}.`);
}

async function main() {
  const requested = process.argv.slice(2);
  const metros =
    requested.length > 0
      ? METROS.filter((metro) => requested.includes(metro.id))
      : METROS;
  const sharedTransit = await fetchSharedTransit();
  for (const metro of metros) {
    await runMetro(metro.id, sharedTransit);
  }
  console.log("\nAll metros done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
