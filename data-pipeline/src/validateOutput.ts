import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS } from "@buffer-zones/shared";
import { validateOutputDirectory } from "./outputManifest";

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

export async function runOutputValidation(outputDir: string): Promise<void> {
  const issues = await validateOutputDirectory(outputDir);
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
  for (const region of REGIONS) {
    const outputDir = resolve(outputRoot, region.id);
    if (!(await pathExists(outputDir))) {
      continue;
    }
    await runOutputValidation(outputDir);
    validatedCount += 1;
  }

  // Validating nothing means the published data is missing or misnamed: fail closed.
  if (validatedCount === 0) {
    throw new Error(`No region output directories found under ${outputRoot}.`);
  }
}

function isDirectExecution(argv: readonly string[]): boolean {
  const commandPath = argv[1];
  if (!commandPath) {
    return false;
  }

  return resolve(commandPath) === fileURLToPath(import.meta.url);
}

if (isDirectExecution(process.argv)) {
  runAllRegionsOutputValidation().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
