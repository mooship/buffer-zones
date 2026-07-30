import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clearCache, getCacheDir, pruneCache } from "./cache";

const DEFAULT_MAX_AGE_DAYS = 7;

export function parseMode(argv: readonly string[]): "all" | "stale" {
  return argv.includes("--all") ? "all" : "stale";
}

export function parseMaxAgeDays(argv: readonly string[]): number {
  const index = argv.findIndex((arg) => arg === "--max-age-days");
  if (index < 0) {
    return DEFAULT_MAX_AGE_DAYS;
  }

  const raw = argv[index + 1];
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    throw new Error("--max-age-days requires a positive number");
  }

  return parsed;
}

export async function runCleanCache(argv: readonly string[]): Promise<void> {
  const mode = parseMode(argv);
  const cacheDir = getCacheDir();

  if (mode === "all") {
    await clearCache();
    console.log(`Removed cache directory: ${cacheDir}`);
    return;
  }

  const maxAgeDays = parseMaxAgeDays(argv);
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const removed = await pruneCache(maxAgeMs);
  console.log(
    `Pruned ${removed} stale cache file(s) older than ${maxAgeDays} day(s) from ${cacheDir}`,
  );
}

function isDirectExecution(argv: readonly string[]): boolean {
  const commandPath = argv[1];
  if (!commandPath) {
    return false;
  }

  return resolve(commandPath) === fileURLToPath(import.meta.url);
}

if (isDirectExecution(process.argv)) {
  runCleanCache(process.argv).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
