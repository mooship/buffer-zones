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

async function runNational(): Promise<void> {
  const outputDir = resolve(OUTPUT_ROOT, "national");
  const sharedTransit = await fetchSharedTransit();

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

  const allTownships = [];
  const allNormalizedTownships = [];
  const brtCollections = [];

  for (const metro of METROS) {
    console.log(`\n=== ${metro.id} ===`);
    console.log(`Fetching ${metro.id} sub-place boundaries...`);
    const rawBoundaries = await fetchMetroBoundaries(metro.id);
    const townships = normalizeBoundaries(rawBoundaries);
    console.log(`  ${townships.length} sub-places loaded`);

    const jobCenters = getJobCentersForMetro(metro.id);
    console.log("Computing drive times...");
    const nearestJobCenters = await getNearestJobCenter(
      townships.map((t) => t.centroid),
      jobCenters,
    );

    const transitCollections = [
      sharedTransit.gautrain,
      sharedTransit.prasa,
      sharedTransit.gautrainBus,
    ];

    if (metro.id === "tshwane") {
      console.log("Fetching A Re Yeng routes...");
      const rawAReYeng = await fetchAReYengRoutes();
      const aReYeng =
        "elements" in rawAReYeng
          ? normalizeAReYengOverpass(rawAReYeng)
          : normalizeAReYeng(rawAReYeng);
      brtCollections.push(...aReYeng.features);
      transitCollections.push(aReYeng);
    }

    if (metro.id === "johannesburg") {
      const bbox = getMetroBbox(metro.id);
      console.log("Fetching Rea Vaya routes via Overpass...");
      const reaVaya = normalizeReaVayaOverpass(await fetchReaVayaRoutes(bbox));
      brtCollections.push(...reaVaya.features);
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
    allTownships.push(...townshipFeatures);
    allNormalizedTownships.push(...townships);
  }

  console.log("Writing national files...");

  const townshipCollection = {
    type: "FeatureCollection" as const,
    features: allTownships,
  };
  await writeGeoJsonFile(
    resolve(outputDir, "townships.v1.geojson"),
    townshipCollection,
  );
  await writeGeoJsonFile(
    resolve(outputDir, "townships.display.v1.geojson"),
    createDisplayPolygons(townshipCollection),
    { compact: true },
  );

  const townshipAreas = createTownshipAreas(allNormalizedTownships);
  await writeGeoJsonFile(
    resolve(outputDir, "township-areas.v1.geojson"),
    townshipAreas,
  );
  await writeGeoJsonFile(
    resolve(outputDir, "township-areas.display.v1.geojson"),
    createDisplayPolygons(townshipAreas),
    { compact: true },
  );

  const brt: TransitLayerFeatureCollection = {
    type: "FeatureCollection",
    features: brtCollections,
  };

  await writeTransitLayer("rapid-rail", sharedTransit.gautrain);
  await writeTransitLayer("commuter-rail", sharedTransit.prasa);
  await writeTransitLayer("bus-rapid-transit", brt);
  await writeTransitLayer("bus", sharedTransit.gautrainBus);
}

runNational().catch((err) => {
  console.error(err);
  process.exit(1);
});
