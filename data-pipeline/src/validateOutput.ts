import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS } from "@stratum/app";
import { isDirectExecution } from "./cliEntry";
import { validateOutputDirectory } from "./outputManifest";
import type { RegionPipelineConfig } from "./pipelineSource";
import { getRegionPipelineConfig } from "./regionPipelineConfigs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_ROOT = resolve(__dirname, "../../packages/web/public/data");

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

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
