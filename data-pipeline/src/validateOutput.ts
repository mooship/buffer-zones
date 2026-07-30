import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateOutputDirectory } from "./outputManifest";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_DIR = resolve(
  __dirname,
  "../../packages/web/public/data/national",
);

export async function runOutputValidation(
  outputDir = OUTPUT_DIR,
): Promise<void> {
  const issues = await validateOutputDirectory(outputDir);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    throw new Error("Output validation failed.");
  }

  console.log("National output validation passed.");
}

function isDirectExecution(argv: readonly string[]): boolean {
  const commandPath = argv[1];
  if (!commandPath) {
    return false;
  }

  return resolve(commandPath) === fileURLToPath(import.meta.url);
}

if (isDirectExecution(process.argv)) {
  runOutputValidation().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
