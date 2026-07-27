import type { JobCenter } from "./constants/jobCenters";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface NearestJobCenterResult {
  minutes: number | null;
  jobCenterId: string | null;
  jobCenterName: string | null;
}

const OSRM_BASE_URL = "https://router.project-osrm.org";
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTable(
  origins: LatLon[],
  destinations: readonly JobCenter[],
  attempt = 1,
): Promise<(number | null)[][]> {
  const coords = [...origins, ...destinations]
    .map((c) => `${c.lon},${c.lat}`)
    .join(";");
  const sourceIndices = origins.map((_, i) => i).join(";");
  const destinationIndices = destinations
    .map((_, i) => origins.length + i)
    .join(";");
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?sources=${sourceIndices}&destinations=${destinationIndices}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429 && attempt < 3) {
      await sleep(BATCH_DELAY_MS * attempt);
      return fetchTable(origins, destinations, attempt + 1);
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
  return body.durations;
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
