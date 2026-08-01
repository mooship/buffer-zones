import { readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METROS,
  REGIONS,
  type TransitLayerFeatureCollection,
} from "@buffer-zones/shared";
import {
  fetchMetroBoundaries,
  normalizeBoundaries,
} from "./adapters/boundaries";
import { pruneCache } from "./cache";
import { getJobCentersForMetro } from "./constants/jobCenters";
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
import type { RegionPipelineConfig } from "./pipelineSource";
import {
  REGION_PIPELINE_CONFIGS,
  getRegionPipelineConfig,
} from "./regionPipelineConfigs";
import { createTownshipAreas } from "./townshipAreas";
import { computeNearestTransitKm } from "./transitDistance";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

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

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
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

async function cleanupStagingDirectories(
  rootDir: string,
  regionId: string,
): Promise<void> {
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
          entry.isDirectory() &&
          entry.name.startsWith(`${regionId}.__staging__`),
      )
      .map((entry) =>
        rm(resolve(rootDir, entry.name), { recursive: true, force: true }),
      ),
  );
}

async function runRegion(config: RegionPipelineConfig): Promise<void> {
  const { regionId, metros } = config;

  await pruneCache(7 * 24 * 60 * 60 * 1000);
  assertMetroSetup();
  await cleanupStagingDirectories(OUTPUT_ROOT, regionId);

  if (metros.length === 0) {
    throw new Error(`No metros configured for region: ${regionId}`);
  }

  const publishDir = resolve(OUTPUT_ROOT, regionId);
  const stagedDir = resolve(
    OUTPUT_ROOT,
    `${regionId}.__staging__${Date.now()}`,
  );

  try {
    const outputDir = stagedDir;

    const fetchedSources = await Promise.all(
      config.sources.map(async (source) => ({
        source,
        collection: await timedStep(
          `Fetching ${source.layerId} for ${regionId}`,
          source.fetch,
          (raw) => `(${raw.features.length} features)`,
        ),
      })),
    );
    const transitCollections = fetchedSources.map(
      (entry) => entry.collection as TransitLayerFeatureCollection,
    );

    const allTownships = [];
    const allNormalizedTownships = [];
    const metroTownshipCounts: Record<string, number> = {};

    for (const metro of metros) {
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

    console.log(`Writing ${regionId} files...`);

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

    const networkCoverage = mergeNetworkCoverage(
      ...fetchedSources.map((entry) => countTransitNetworks(entry.collection)),
    );
    assertCompleteNetworkCoverage(networkCoverage);

    for (const { source, collection } of fetchedSources) {
      await writeGeoJsonFile(
        resolve(outputDir, source.outputFileName),
        createDisplayTransit(collection as TransitLayerFeatureCollection),
        { compact: true },
      );
    }

    const manifest = await buildOutputManifest(
      outputDir,
      metros.map((metro) => metro.id),
      networkCoverage,
      config,
    );
    await writeGeoJsonFile(resolve(outputDir, "manifest.v1.json"), manifest);

    const issues = await validateOutputDirectory(outputDir, config);
    if (issues.length > 0) {
      throw new Error(`Output validation failed: ${issues.join("; ")}`);
    }

    await promoteStagedOutput(stagedDir, publishDir);

    console.log(`\nPublished ${regionId} dataset:`);
    for (const metro of metros) {
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

async function runAllProvinceRegions(): Promise<void> {
  const provinceRegionIds = new Set(
    REGIONS.filter((region) => region.kind === "province").map(
      (region) => region.id,
    ),
  );
  for (const config of REGION_PIPELINE_CONFIGS) {
    if (!provinceRegionIds.has(config.regionId)) {
      continue;
    }
    console.log(`\n### Region: ${config.regionId} ###`);
    await runRegion(config);
  }
}

const regionArgIndex = process.argv.indexOf("--region");
const requestedRegionId =
  regionArgIndex >= 0 ? process.argv[regionArgIndex + 1] : undefined;

const work = requestedRegionId
  ? runRegion(getRegionPipelineConfig(requestedRegionId))
  : runAllProvinceRegions();

work.catch((err) => {
  console.error(err);
  process.exit(1);
});
