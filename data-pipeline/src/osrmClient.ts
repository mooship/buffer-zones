import { hashKey, readJsonCache, writeJsonCache } from "./cache";
import type { JobCenter } from "./constants/jobCenters";
import { getOsrmBaseUrl } from "./constants/serviceUrls";

/** A geographic point in decimal degrees. */
export interface LatLon {
  lat: number;
  lon: number;
}

/** The nearest job centre to an origin point, and the modelled drive time to reach it. */
export interface NearestJobCenterResult {
  /** Rounded to two decimal places. `null` if OSRM found no route to any destination. */
  minutes: number | null;
  jobCenterId: string | null;
  jobCenterName: string | null;
}

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;
const OSRM_TIMEOUT_MS = 30_000;
const OSRM_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTable(
  origins: LatLon[],
  destinations: readonly JobCenter[],
): Promise<(number | null)[][]> {
  const coords = [...origins, ...destinations]
    .map((c) => `${c.lon},${c.lat}`)
    .join(";");
  const sourceIndices = origins.map((_, i) => i).join(";");
  const destinationIndices = destinations
    .map((_, i) => origins.length + i)
    .join(";");
  const url = `${getOsrmBaseUrl()}/table/v1/driving/${coords}?sources=${sourceIndices}&destinations=${destinationIndices}`;
  const cacheKey = hashKey([
    "osrm-table",
    getOsrmBaseUrl(),
    coords,
    sourceIndices,
    destinationIndices,
  ]);
  const cached = await readJsonCache<(number | null)[][]>("osrm", cacheKey, {
    maxAgeMs: OSRM_CACHE_MAX_AGE_MS,
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, OSRM_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        if (
          (response.status === 429 || response.status === 504) &&
          attempt < 3
        ) {
          await sleep(BATCH_DELAY_MS * attempt);
          continue;
        }
        throw new Error(`OSRM table request failed: ${response.status}`);
      }

      const body = (await response.json()) as {
        code: string;
        durations: (number | null)[][];
      };
      if (body.code !== "Ok") {
        throw new Error(`OSRM table returned code ${body.code}`);
      }
      await writeJsonCache("osrm", cacheKey, body.durations);
      return body.durations;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(BATCH_DELAY_MS * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (cached) {
    return cached;
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error(`OSRM table request timed out after ${OSRM_TIMEOUT_MS}ms`);
  }

  throw lastError;
}

function pickNearest(
  row: (number | null)[],
  destinations: readonly JobCenter[],
): NearestJobCenterResult {
  let bestIndex = -1;
  let bestSeconds = Number.POSITIVE_INFINITY;

  for (let i = 0; i < row.length; i++) {
    const seconds = row[i];
    if (seconds !== null && seconds !== undefined && seconds < bestSeconds) {
      bestSeconds = seconds;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) {
    return { minutes: null, jobCenterId: null, jobCenterName: null };
  }

  const destination = destinations[bestIndex];
  if (!destination) {
    return { minutes: null, jobCenterId: null, jobCenterName: null };
  }

  return {
    minutes: Math.round((bestSeconds / 60) * 100) / 100,
    jobCenterId: destination.id,
    jobCenterName: destination.name,
  };
}

/**
 * For each origin, finds the nearest of `destinations` by modelled car
 * drive time, via OSRM's table API. Origins are queried in batches of
 * `BATCH_SIZE` (a single table request covers a whole batch × all
 * destinations), with a fixed delay between batches and a fall back to a
 * cached response if a batch's requests are all exhausted.
 */
export async function getNearestJobCenter(
  origins: LatLon[],
  destinations: readonly JobCenter[],
): Promise<NearestJobCenterResult[]> {
  const results: NearestJobCenterResult[] = [];

  for (let start = 0; start < origins.length; start += BATCH_SIZE) {
    const batch = origins.slice(start, start + BATCH_SIZE);
    const durations = await fetchTable(batch, destinations);
    for (const row of durations) {
      results.push(pickNearest(row, destinations));
    }

    if (start + BATCH_SIZE < origins.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}
