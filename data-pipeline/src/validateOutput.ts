import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS } from "@karta/app";
import { isDirectExecution } from "./cliEntry";
import { pathExists } from "./fsUtils";
import { validateOutputDirectory } from "./outputManifest";
import type { RegionPipelineConfig } from "./pipelineSource";
import { getRegionPipelineConfig } from "./regionPipelineConfigs";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Root directory every region's output is written under and validated from. */
export const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

/**
 * Validates one region's output directory, logging every issue found.
 * @throws If `validateOutputDirectory` reports any issue.
 */
export async function runOutputValidation(
  outputDir: string,
  config: RegionPipelineConfig,
): Promise<void> {
  const issues = await validateOutputDirectory(outputDir, config);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    throw new Error(`Output validation failed for ${outputDir}.`);
  }

  console.log(`Output validation passed for ${outputDir}.`);
}

/**
 * `npm run validate` entry point: validates every configured region whose
 * output directory exists under `outputRoot`, skipping regions that haven't
 * been built yet.
 * @throws If no region output directories exist at all, if a region with an
 *   existing output directory has no registered pipeline config, or if any
 *   validated region reports an issue.
 */
export async function runAllRegionsOutputValidation(
  outputRoot = OUTPUT_ROOT,
): Promise<void> {
  let validatedCount = 0;
  const misconfiguredRegionIds: string[] = [];

  for (const region of REGIONS) {
    const outputDir = resolve(outputRoot, region.id);
    if (!(await pathExists(outputDir))) {
      continue;
    }

    let config: RegionPipelineConfig;
    try {
      config = getRegionPipelineConfig(region.id);
    } catch (error) {
      /* v8 ignore next -- unreachable: getRegionPipelineConfig only ever throws a real Error */
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Output validation failed for ${outputDir}: ${message}`);
      misconfiguredRegionIds.push(region.id);
      continue;
    }

    await runOutputValidation(outputDir, config);
    validatedCount += 1;
  }

  // Validating nothing means the published data is missing or misnamed: fail closed.
  if (validatedCount === 0 && misconfiguredRegionIds.length === 0) {
    throw new Error(`No region output directories found under ${outputRoot}.`);
  }

  if (misconfiguredRegionIds.length > 0) {
    throw new Error(
      `No pipeline config registered for region(s): ${misconfiguredRegionIds.join(", ")}.`,
    );
  }
}

/* v8 ignore start -- exercised via `npm run validate`, not unit tests */
if (isDirectExecution(process.argv, import.meta.url)) {
  runAllRegionsOutputValidation().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
/* v8 ignore stop */
