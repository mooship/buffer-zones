import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS, type TransitLayerFeatureCollection } from "@stratum/app";
import {
  fetchMetroBoundaries,
  normalizeBoundaries,
} from "./adapters/boundaries";
import { pruneCache } from "./cache";
import { isDirectExecution } from "./cliEntry";
import { getJobCentersForMetro } from "./constants/jobCenters";
import { createDisplayPolygons } from "./displayTownships";
import { createDisplayTransit } from "./displayTransit";
import { writeGeoJsonFile } from "./export";
import { joinTownshipData } from "./join";
import { getNearestJobCenter } from "./osrmClient";
import {
  buildOutputManifest,
  countTransitNetworks,
  validateOutputDirectory,
} from "./outputManifest";
import type { RegionPipelineConfig } from "./pipelineSource";
import {
  getRegionPipelineConfig,
  REGION_PIPELINE_CONFIGS,
} from "./regionPipelineConfigs";
import {
  assertCompleteNetworkCoverage,
  assertMetroSetup,
  cleanupStagingDirectories,
  formatDuration,
  mergeNetworkCoverage,
  promoteStagedOutput,
} from "./runHelpers";
import { createTownshipAreas } from "./townshipAreas";
import { computeNearestTransitKm } from "./transitDistance";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

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

/* v8 ignore start -- exercised via `npm run run`, not unit tests: runs the real pipeline against live external services */
if (isDirectExecution(process.argv, import.meta.url)) {
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
}
/* v8 ignore stop */
