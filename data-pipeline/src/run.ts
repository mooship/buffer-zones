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

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

async function timedStep<T>(
  label: string,
  work: () => Promise<T>,
  successMessage?: (result: T) => string,
): Promise<T> {
  const startedAt = Date.now();
  console.log(`${label}...`);
  try {
    const result = await work();
    const elapsed = Date.now() - startedAt;
    const suffix = successMessage ? ` ${successMessage(result)}` : "";
    console.log(`  done in ${formatDuration(elapsed)}${suffix}`);
    return result;
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    console.log(`  failed after ${formatDuration(elapsed)}`);
    throw error;
  }
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
  const candidates = [
    resolve(outputDir, `${layerName}.display.v1.geojson`),
    resolve(outputDir, `${layerName}.v1.geojson`),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as TransitLayerFeatureCollection;
      if (Array.isArray(parsed.features) && parsed.features.length > 0) {
        return parsed;
      }
    } catch {}
  }

  return null;
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

  let gautrain = emptyTransitCollection();
  try {
    const gautrainRaw = await timedStep(
      "Fetching Gautrain rail via Overpass (Gauteng-wide)",
      () => fetchGautrainRail(bbox),
      (raw) => `(${raw.elements.length} elements)`,
    );
    gautrain = normalizeGautrainOverpass(gautrainRaw);
  } catch (error) {
    console.warn("Skipping Gautrain rail due to fetch failure", error);
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

  let prasa = emptyTransitCollection();
  try {
    const prasaRaw = await timedStep(
      "Fetching PRASA rail via Overpass (Gauteng-wide)",
      () => fetchPrasaRail(bbox),
      (raw) => `(${raw.elements.length} elements)`,
    );
    prasa = normalizePrasaOverpass(prasaRaw);
  } catch (error) {
    console.warn("Skipping PRASA rail due to fetch failure", error);
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

  let gautrainBus = emptyTransitCollection();
  try {
    const gautrainBusRaw = await timedStep(
      "Fetching Gautrain bus routes via Overpass (Gauteng-wide)",
      () => fetchGautrainBusRoutes(bbox),
      (raw) => `(${raw.elements.length} elements)`,
    );
    gautrainBus = normalizeGautrainBusOverpass(gautrainBusRaw);
  } catch (error) {
    console.warn("Skipping Gautrain Bus due to fetch failure", error);
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
      const rawBoundaries = await timedStep(
        `Fetching ${metro.id} sub-place boundaries`,
        () => fetchMetroBoundaries(metro.id),
      );
      const townships = normalizeBoundaries(rawBoundaries);
      console.log(`  ${townships.length} sub-places loaded`);

      const jobCenters = getJobCentersForMetro(metro.id);
      if (jobCenters.length === 0) {
        throw new Error(`No job centers configured for ${metro.id}`);
      }

      const nearestJobCenters = await timedStep("Computing drive times", () =>
        getNearestJobCenter(
          townships.map((township) => township.centroid),
          jobCenters,
        ),
      );

      const transitCollections = [
        sharedTransit.gautrain,
        sharedTransit.prasa,
        sharedTransit.gautrainBus,
      ];

      if (metro.id === "tshwane") {
        const bbox = getMetroBbox(metro.id);
        const rawAReYeng = await timedStep("Fetching A Re Yeng routes", () =>
          fetchAReYengRoutes(),
        );

        const tshwaneBusRaw = await timedStep(
          "Fetching Tshwane Bus Services routes via Overpass",
          () => fetchTshwaneBusRoutes(bbox),
          (raw) => `(${raw.elements.length} elements)`,
        );

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
        const reaVayaRaw = await timedStep(
          "Fetching Rea Vaya routes via Overpass",
          () => fetchReaVayaRoutes(bbox),
          (raw) => `(${raw.elements.length} elements)`,
        );
        const reaVaya = normalizeReaVayaOverpass(reaVayaRaw);
        brtCollections.push(...reaVaya.features);
        transitCollections.push(reaVaya);
      }

      if (metro.id === "ekurhuleni") {
        const ekurhuleniIrptnRaw = await timedStep(
          "Fetching Ekurhuleni IRPTN routes",
          () => fetchEkurhuleniIrptnRoutes(),
          (raw) => `(${raw.features.length} features)`,
        );
        const ekurhuleniIrptn = normalizeEkurhuleniIrptn(ekurhuleniIrptnRaw);
        brtCollections.push(...ekurhuleniIrptn.features);
        transitCollections.push(ekurhuleniIrptn);
      }

      const nearestTransitKm = await timedStep(
        "Computing nearest-transit distances",
        async () =>
          computeNearestTransitKm(
            townships.map((township) => township.centroid),
            transitCollections,
          ),
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
      resolve(outputDir, "townships.display.v1.geojson"),
      createDisplayPolygons(townshipCollection),
      { compact: true },
    );

    const townshipAreas = createTownshipAreas(allNormalizedTownships);
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
