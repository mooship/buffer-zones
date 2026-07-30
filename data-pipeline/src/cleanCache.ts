import { clearCache, getCacheDir, pruneCache } from "./cache";

const DEFAULT_MAX_AGE_DAYS = 7;

function parseMode(): "all" | "stale" {
  return process.argv.includes("--all") ? "all" : "stale";
}

function parseMaxAgeDays(): number {
  const index = process.argv.findIndex((arg) => arg === "--max-age-days");
  if (index < 0) {
    return DEFAULT_MAX_AGE_DAYS;
  }

  const raw = process.argv[index + 1];
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    throw new Error("--max-age-days requires a positive number");
  }

  return parsed;
}

async function main(): Promise<void> {
  const mode = parseMode();
  const cacheDir = getCacheDir();

  if (mode === "all") {
    await clearCache();
    console.log(`Removed cache directory: ${cacheDir}`);
    return;
  }

  const maxAgeDays = parseMaxAgeDays();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const removed = await pruneCache(maxAgeMs);
  console.log(
    `Pruned ${removed} stale cache file(s) older than ${maxAgeDays} day(s) from ${cacheDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
