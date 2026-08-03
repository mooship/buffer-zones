import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_DIR = resolve(__dirname, "../.cache");

interface CacheReadOptions {
  maxAgeMs?: number;
  allowStale?: boolean;
}

function cacheEnabled(): boolean {
  return process.env.PIPELINE_CACHE !== "0" && process.env.VITEST !== "true";
}

function cacheDir(): string {
  return process.env.PIPELINE_CACHE_DIR ?? DEFAULT_CACHE_DIR;
}

/** The on-disk directory JSON cache entries are read/written under, honouring `PIPELINE_CACHE_DIR`. */
export function getCacheDir(): string {
  return cacheDir();
}

function cachePath(namespace: string, key: string): string {
  return resolve(cacheDir(), namespace, `${key}.json`);
}

/** Deterministically hashes `parts` into a cache key (e.g. a query string), for use with `readJsonCache`/`writeJsonCache`. */
export function hashKey(parts: readonly string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\n");
  }
  return hash.digest("hex");
}

/**
 * Reads a cached JSON value, or `null` if disabled (`PIPELINE_CACHE=0` or
 * running under vitest), missing, unreadable, or older than `maxAgeMs`
 * (unless `allowStale` is set).
 */
export async function readJsonCache<T>(
  namespace: string,
  key: string,
  options: CacheReadOptions = {},
): Promise<T | null> {
  if (!cacheEnabled()) {
    return null;
  }

  const path = cachePath(namespace, key);
  try {
    const [raw, metadata] = await Promise.all([
      readFile(path, "utf8"),
      stat(path),
    ]);
    const ageMs = Date.now() - metadata.mtimeMs;
    if (
      !options.allowStale &&
      options.maxAgeMs !== undefined &&
      ageMs > options.maxAgeMs
    ) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Writes a JSON value to the cache under `namespace`/`key`. A no-op if caching is disabled. */
export async function writeJsonCache<T>(
  namespace: string,
  key: string,
  value: T,
): Promise<void> {
  if (!cacheEnabled()) {
    return;
  }

  const path = cachePath(namespace, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}

/** Deletes the entire cache directory. */
export async function clearCache(): Promise<void> {
  await rm(cacheDir(), { recursive: true, force: true });
}

async function pruneDirectory(path: string, cutoffMs: number): Promise<number> {
  let removed = 0;

  const entries = await readdir(path, {
    withFileTypes: true,
    encoding: "utf8",
  }).catch(() => {
    return null;
  });

  if (!entries) {
    return 0;
  }

  for (const entry of entries) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      removed += await pruneDirectory(entryPath, cutoffMs);
      continue;
    }

    try {
      const metadata = await stat(entryPath);
      if (metadata.mtimeMs < cutoffMs) {
        await unlink(entryPath);
        removed += 1;
      }
      /* v8 ignore start -- race condition (concurrent prune/manual delete), not deterministically testable */
    } catch {
      // Skip files that disappear while pruning.
    }
    /* v8 ignore stop */
  }

  return removed;
}

/**
 * Recursively deletes every cache file older than `maxAgeMs`.
 * @returns The number of files removed.
 */
export async function pruneCache(maxAgeMs: number): Promise<number> {
  const cutoffMs = Date.now() - maxAgeMs;
  return pruneDirectory(cacheDir(), cutoffMs);
}
