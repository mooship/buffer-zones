import { readdir, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { METROS, type MetroId } from "@karta/app";
import { getJobCentersForMetro } from "./constants/jobCenters";
import { pathExists } from "./fsUtils";
import { REQUIRED_TRANSIT_NETWORKS } from "./outputManifest";

/** Formats a millisecond duration for a pipeline progress log line. */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Sums per-network feature counts across multiple sources' `countTransitNetworks` results. */
export function mergeNetworkCoverage(
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

/**
 * Checks that every network in `requiredNetworks` has at least one feature
 * in `networkCoverage`.
 * @throws Listing every required network with no coverage.
 */
export function assertCompleteNetworkCoverage(
  networkCoverage: Record<string, number>,
  requiredNetworks: readonly string[] = REQUIRED_TRANSIT_NETWORKS,
): void {
  const missing = requiredNetworks.filter(
    (network) => (networkCoverage[network] ?? 0) < 1,
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required transit network coverage: ${missing.join(", ")}`,
    );
  }
}

/**
 * Compares a metro's declared job-centre count against its actual
 * configured count.
 * @returns A description of the mismatch, or `null` if they match.
 */
export function findJobCenterCountMismatch(
  metroId: MetroId,
  expectedCount: number,
  actualCount: number,
): string | null {
  if (actualCount === expectedCount) {
    return null;
  }
  return `Job center count mismatch for ${metroId}: expected ${expectedCount}, got ${actualCount}`;
}

/**
 * Checks that each metro's declared `jobCenterCount` matches its actual
 * configured job centres, catching a `constants/metros.ts` edit that wasn't
 * kept in sync with `constants/jobCenters.ts`.
 * @throws On the first mismatch found.
 */
export function assertMetroSetup(): void {
  for (const metro of METROS) {
    const mismatch = findJobCenterCountMismatch(
      metro.id,
      metro.jobCenterCount,
      getJobCentersForMetro(metro.id).length,
    );
    if (mismatch) {
      throw new Error(mismatch);
    }
  }
}

/**
 * Publishes a staged output directory by swapping it in for `publishDir`,
 * keeping a `.backup` copy of the previous contents until the swap
 * succeeds, and restoring it if the rename fails partway through.
 */
export async function promoteStagedOutput(
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

/** Deletes every leftover `<regionId>.__staging__*` directory under `rootDir` from a previous, interrupted run. */
export async function cleanupStagingDirectories(
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
