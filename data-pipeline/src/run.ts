import { readFile, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METROS,
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
  fetchEkurhuleniIrptnRoutes,
  normalizeEkurhuleniIrptn,
} from "./adapters/ekurhuleniIrptn";
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
import {
  fetchTshwaneBusRoutes,
  normalizeTshwaneBusOverpass,
} from "./adapters/tshwaneBus";
import { pruneCache } from "./cache";
import { getJobCentersForMetro } from "./constants/jobCenters";
import { getMetroBbox, getSharedTransitBbox } from "./constants/metroBbox";
import { createDisplayPolygons } from "./displayTownships";
import { createDisplayTransit } from "./displayTransit";
import { writeGeoJsonFile } from "./export";
import { joinTownshipData } from "./join";
import { getNearestJobCenter } from "./osrmClient";
import {
  REQUIRED_TRANSIT_NETWORKS,
  buildOutputManifest,
  countTransitNetworks,
  validateOutputDirectory,
} from "./outputManifest";
import { createTownshipAreas } from "./townshipAreas";
import { computeNearestTransitKm } from "./transitDistance";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

interface SharedTransit {
  gautrain: TransitLayerFeatureCollection;
  gautrainBus: TransitLayerFeatureCollection;
  prasa: TransitLayerFeatureCollection;
}

function emptyTransitCollection(): TransitLayerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readExistingTransitLayer(
  outputDir: string,
  layerName: string,
): Promise<TransitLayerFeatureCollection | null> {
  try {
    const raw = await readFile(
      resolve(outputDir, `${layerName}.v1.geojson`),
      "utf8",
    );
    const parsed = JSON.parse(raw) as TransitLayerFeatureCollection;
    return Array.isArray(parsed.features) && parsed.features.length > 0
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function assertCompleteNetworkCoverage(
  networkCoverage: Record<string, number>,
): void {
  const missing = REQUIRED_TRANSIT_NETWORKS.filter(
    (network) => (networkCoverage[network] ?? 0) < 1,
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required transit network coverage: ${missing.join(", ")}`,
    );
  }
}

function mergeNetworkCoverage(
  ...maps: ReadonlyArray<Record<string, number>>
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const map of maps) {
    for (const [network, count] of Object.entries(map)) {
      merged[network] = (merged[network] ?? 0) + count;
    }
  }
  return merged;
}

function assertMetroSetup(): void {
  for (const metro of METROS) {
    const count = getJobCentersForMetro(metro.id).length;
    if (count !== metro.jobCenterCount) {
      throw new Error(
        `Job center count mismatch for ${metro.id}: expected ${metro.jobCenterCount}, got ${count}`,
      );
    }
  }
}

async function promoteStagedOutput(
  stagedDir: string,
  publishDir: string,
): Promise<void> {
  const backupDir = `${publishDir}.backup`;

  await rm(backupDir, { recursive: true, force: true });

  const publishExists = await pathExists(publishDir);
  if (publishExists) {
    await rename(publishDir, backupDir);
  }

  try {
    await rename(stagedDir, publishDir);
  } catch (error) {
    if (publishExists && (await pathExists(backupDir))) {
      await rename(backupDir, publishDir);
    }
    throw error;
  }

  await rm(backupDir, { recursive: true, force: true });
}

async function cleanupStagingDirectories(rootDir: string): Promise<void> {
  const entries = await readdir(rootDir, {
    withFileTypes: true,
    encoding: "utf8",
  }).catch(() => {
    return [];
  });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name.startsWith("national.__staging__"),
      )
      .map((entry) =>
        rm(resolve(rootDir, entry.name), { recursive: true, force: true }),
      ),
  );
}

async function fetchSharedTransit(): Promise<SharedTransit> {
  const bbox = getSharedTransitBbox();
  const publishedOutputDir = resolve(OUTPUT_ROOT, "national");

  console.log("Fetching Gautrain rail via Overpass (Gauteng-wide)...");
  console.log("Fetching PRASA rail via Overpass (Gauteng-wide)...");
  console.log("Fetching Gautrain bus routes via Overpass (Gauteng-wide)...");

  const [gautrainResult, prasaResult, gautrainBusResult] =
    await Promise.allSettled([
      fetchGautrainRail(bbox),
      fetchPrasaRail(bbox),
      fetchGautrainBusRoutes(bbox),
    ]);

  let gautrain =
    gautrainResult.status === "fulfilled"
      ? normalizeGautrainOverpass(gautrainResult.value)
      : emptyTransitCollection();
  let prasa =
    prasaResult.status === "fulfilled"
      ? normalizePrasaOverpass(prasaResult.value)
      : emptyTransitCollection();
  let gautrainBus =
    gautrainBusResult.status === "fulfilled"
      ? normalizeGautrainBusOverpass(gautrainBusResult.value)
      : emptyTransitCollection();

  if (gautrainResult.status === "rejected") {
    console.warn(
      "Skipping Gautrain rail due to fetch failure",
      gautrainResult.reason,
    );
    const fallback = await readExistingTransitLayer(
      publishedOutputDir,
      "rapid-rail",
    );
    if (!fallback) {
      throw new Error(
        "Failed to fetch Gautrain rail and no fallback output exists",
      );
    }
    gautrain = fallback;
  }

  if (prasaResult.status === "rejected") {
    console.warn(
      "Skipping PRASA rail due to fetch failure",
      prasaResult.reason,
    );
    const fallback = await readExistingTransitLayer(
      publishedOutputDir,
      "commuter-rail",
    );
    if (!fallback) {
      throw new Error(
        "Failed to fetch PRASA rail and no fallback output exists",
      );
    }
    prasa = fallback;
  }

  if (gautrainBusResult.status === "rejected") {
    console.warn(
      "Skipping Gautrain Bus due to fetch failure",
      gautrainBusResult.reason,
    );
    const fallback = await readExistingTransitLayer(publishedOutputDir, "bus");
    if (!fallback) {
      throw new Error(
        "Failed to fetch Gautrain Bus and no fallback output exists",
      );
    }
    gautrainBus = {
      type: "FeatureCollection",
      features: fallback.features.filter(
        (feature) =>
          (feature.properties as { network?: unknown } | null)?.network ===
          "Gautrain Bus",
      ),
    };
    if (gautrainBus.features.length === 0) {
      throw new Error("Failed to recover Gautrain Bus from fallback output");
    }
  }

  return { gautrain, gautrainBus, prasa };
}

async function runNational(): Promise<void> {
  await pruneCache(7 * 24 * 60 * 60 * 1000);
  assertMetroSetup();
  await cleanupStagingDirectories(OUTPUT_ROOT);

  const publishDir = resolve(OUTPUT_ROOT, "national");
  const stagedDir = resolve(OUTPUT_ROOT, `national.__staging__${Date.now()}`);

  try {
    const outputDir = stagedDir;
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
    const busCollections = [...sharedTransit.gautrainBus.features];
    const metroTownshipCounts: Record<string, number> = {};

    for (const metro of METROS) {
      console.log(`\n=== ${metro.id} ===`);
      console.log(`Fetching ${metro.id} sub-place boundaries...`);
      const rawBoundaries = await fetchMetroBoundaries(metro.id);
      const townships = normalizeBoundaries(rawBoundaries);
      console.log(`  ${townships.length} sub-places loaded`);

      const jobCenters = getJobCentersForMetro(metro.id);
      if (jobCenters.length === 0) {
        throw new Error(`No job centers configured for ${metro.id}`);
      }

      console.log("Computing drive times...");
      const nearestJobCenters = await getNearestJobCenter(
        townships.map((township) => township.centroid),
        jobCenters,
      );

      const transitCollections = [
        sharedTransit.gautrain,
        sharedTransit.prasa,
        sharedTransit.gautrainBus,
      ];

      if (metro.id === "tshwane") {
        const bbox = getMetroBbox(metro.id);
        console.log("Fetching A Re Yeng routes...");
        console.log("Fetching Tshwane Bus Services routes via Overpass...");

        const [rawAReYeng, tshwaneBusRaw] = await Promise.all([
          fetchAReYengRoutes(),
          fetchTshwaneBusRoutes(bbox),
        ]);

        const aReYeng =
          "elements" in rawAReYeng
            ? normalizeAReYengOverpass(rawAReYeng)
            : normalizeAReYeng(rawAReYeng);
        brtCollections.push(...aReYeng.features);
        transitCollections.push(aReYeng);

        const tshwaneBus = normalizeTshwaneBusOverpass(tshwaneBusRaw);
        busCollections.push(...tshwaneBus.features);
        transitCollections.push(tshwaneBus);
      }

      if (metro.id === "johannesburg") {
        const bbox = getMetroBbox(metro.id);
        console.log("Fetching Rea Vaya routes via Overpass...");

        const reaVayaRaw = await fetchReaVayaRoutes(bbox);
        const reaVaya = normalizeReaVayaOverpass(reaVayaRaw);
        brtCollections.push(...reaVaya.features);
        transitCollections.push(reaVaya);
      }

      if (metro.id === "ekurhuleni") {
        console.log("Fetching Ekurhuleni IRPTN routes...");

        const ekurhuleniIrptnRaw = await fetchEkurhuleniIrptnRoutes();
        const ekurhuleniIrptn = normalizeEkurhuleniIrptn(ekurhuleniIrptnRaw);
        brtCollections.push(...ekurhuleniIrptn.features);
        transitCollections.push(ekurhuleniIrptn);
      }

      const nearestTransitKm = computeNearestTransitKm(
        townships.map((township) => township.centroid),
        transitCollections,
      );

      const townshipFeatures = joinTownshipData(
        townships,
        nearestJobCenters,
        nearestTransitKm,
      );
      allTownships.push(...townshipFeatures);
      allNormalizedTownships.push(...townships);
      metroTownshipCounts[metro.id] = townshipFeatures.length;
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
    const bus: TransitLayerFeatureCollection = {
      type: "FeatureCollection",
      features: busCollections,
    };

    const networkCoverage = mergeNetworkCoverage(
      countTransitNetworks(sharedTransit.gautrain),
      countTransitNetworks(sharedTransit.prasa),
      countTransitNetworks(brt),
      countTransitNetworks(bus),
    );
    assertCompleteNetworkCoverage(networkCoverage);

    await writeTransitLayer("rapid-rail", sharedTransit.gautrain);
    await writeTransitLayer("commuter-rail", sharedTransit.prasa);
    await writeTransitLayer("bus-rapid-transit", brt);
    await writeTransitLayer("bus", bus);

    const manifest = await buildOutputManifest(
      outputDir,
      METROS.map((metro) => metro.id),
      networkCoverage,
    );
    await writeGeoJsonFile(resolve(outputDir, "manifest.v1.json"), manifest);

    const issues = await validateOutputDirectory(outputDir);
    if (issues.length > 0) {
      throw new Error(`Output validation failed: ${issues.join("; ")}`);
    }

    await promoteStagedOutput(stagedDir, publishDir);

    console.log("\nPublished national dataset:");
    for (const metro of METROS) {
      console.log(
        `  ${metro.id}: ${metroTownshipCounts[metro.id] ?? 0} sub-places`,
      );
    }
    for (const [network, count] of Object.entries(networkCoverage)) {
      console.log(`  ${network}: ${count} features`);
    }
  } catch (error) {
    await rm(stagedDir, { recursive: true, force: true });
    throw error;
  }
}

runNational().catch((err) => {
  console.error(err);
  process.exit(1);
});
