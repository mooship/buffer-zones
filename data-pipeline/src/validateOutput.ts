import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateOutputDirectory } from "./outputManifest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(
  __dirname,
  "../../packages/web/public/data/national",
);

async function main(): Promise<void> {
  const issues = await validateOutputDirectory(OUTPUT_DIR);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    process.exit(1);
  }

  console.log("National output validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
