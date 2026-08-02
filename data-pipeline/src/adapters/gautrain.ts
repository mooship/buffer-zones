import type { TransitLayerFeatureCollection, TransitStop } from "@stratum/app";
import { hashKey, readJsonCache, writeJsonCache } from "../cache";
import { getOverpassUrls } from "../constants/serviceUrls";
import { normalizeRelationTransitOverpass } from "./relationTransit";

const OVERPASS_TIMEOUT_MS = 45_000;
const OVERPASS_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const OVERPASS_MIN_GAP_MS = 1_200;

let overpassRequestQueue = Promise.resolve();
let nextOverpassRequestAt = 0;

function gautrainQuery(bbox: string): string {
  return `
[out:json][timeout:60];
(
  way["railway"="rail"]["operator"~"Gautrain",i](${bbox});
  way["railway"="rail"]["gauge"="1435"](${bbox});
  node["railway"="station"]["operator"~"Gautrain",i](${bbox});
);
out geom;
`;
}

function gautrainBusQuery(bbox: string): string {
  return `
[out:json][timeout:60];
relation["route"="bus"]["operator"~"Gautrain",i](${bbox});
out geom;
`;
}

interface OverpassWayElement {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry: { lat: number; lon: number }[];
}

interface OverpassNodeElement {
  type: "node";
  id: number;
  tags?: Record<string, string>;
  lat: number;
  lon: number;
}

interface OverpassRelationElement {
  type: "relation";
  id: number;
  tags?: Record<string, string>;
  members: {
    type: string;
    ref: number;
    geometry?: { lat: number; lon: number }[];
  }[];
}

export type OverpassElement =
  | OverpassWayElement
  | OverpassNodeElement
  | OverpassRelationElement;
export interface OverpassResponse {
  elements: OverpassElement[];
}

export function normalizeGautrainOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    if (element.type === "relation") {
      continue;
    }
    const stop: TransitStop = {
      id: `${element.type}/${element.id}`,
      name: element.tags?.name ?? "Unnamed",
      network: "Gautrain",
    };

    if (element.type === "way") {
      features.push({
        type: "Feature",
        properties: stop,
        geometry: {
          type: "LineString",
          coordinates: element.geometry.map(
            (p) => [p.lon, p.lat] as [number, number],
          ),
        },
      });
    } else {
      features.push({
        type: "Feature",
        properties: stop,
        geometry: {
          type: "Point",
          coordinates: [element.lon, element.lat] as [number, number],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export function normalizeGautrainBusOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeRelationTransitOverpass(raw, "Gautrain Bus");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * 500);
  return 2000 * attempt + jitter;
}

async function waitForOverpassSlot(): Promise<void> {
  const waitTurn = overpassRequestQueue.then(async () => {
    const waitMs = Math.max(0, nextOverpassRequestAt - Date.now());
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    nextOverpassRequestAt = Date.now() + OVERPASS_MIN_GAP_MS;
  });

  overpassRequestQueue = waitTurn.catch(() => {
    return;
  });

  await waitTurn;
}

// Retries with backoff on a single mirror before rotating to the next one
// (see constants/serviceUrls.ts) on repeated 429/504 responses, since a
// single public Overpass instance can be temporarily rate-limited or
// overloaded while others are not.
export async function fetchOverpass(
  query: string,
  attempt = 1,
): Promise<OverpassResponse> {
  const cacheKey = hashKey(["overpass", query]);
  const cached =
    attempt === 1
      ? await readJsonCache<OverpassResponse>("overpass", cacheKey, {
          maxAgeMs: OVERPASS_CACHE_MAX_AGE_MS,
        })
      : null;

  const urls = getOverpassUrls();
  if (urls.length === 0) {
    throw new Error("No Overpass endpoints are configured");
  }

  const url = urls[(attempt - 1) % urls.length];
  if (!url) {
    throw new Error("No Overpass endpoint available for this attempt");
  }

  await waitForOverpassSlot();

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, OVERPASS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "buffer-zones-data-pipeline (github.com/buffer-zones)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (
        (response.status === 504 || response.status === 429) &&
        attempt < urls.length * 2
      ) {
        await sleep(backoffDelayMs(attempt));
        return fetchOverpass(query, attempt + 1);
      }
      throw new Error(`Overpass query failed: ${response.status}`);
    }

    const body = (await response.json()) as OverpassResponse;
    await writeJsonCache("overpass", cacheKey, body);
    return body;
  } catch (error) {
    const shouldRetry =
      (error instanceof Error && error.name === "AbortError") ||
      error instanceof TypeError;

    if (shouldRetry && attempt < urls.length * 2) {
      await sleep(backoffDelayMs(attempt));
      return fetchOverpass(query, attempt + 1);
    }

    if (cached) {
      return cached;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Overpass query timed out after ${OVERPASS_TIMEOUT_MS}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGautrainRail(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(gautrainQuery(bbox));
}

export async function fetchGautrainBusRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(gautrainBusQuery(bbox));
}
