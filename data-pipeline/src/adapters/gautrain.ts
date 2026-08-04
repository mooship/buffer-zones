import type { TransitLayerFeatureCollection } from "@stratum/app";
import { sleep } from "../asyncUtils";
import { hashKey, readJsonCache, writeJsonCache } from "../cache";
import { getOverpassUrls } from "../constants/serviceUrls";
import {
  normalizeRelationTransitOverpass,
  normalizeWayNodeTransitOverpass,
} from "./overpassNormalizers";

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

/** A single element in an Overpass API response: a way, node, or relation. */
export type OverpassElement =
  | OverpassWayElement
  | OverpassNodeElement
  | OverpassRelationElement;
/** The shape of a raw Overpass API JSON response. */
export interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Normalizes a Gautrain Overpass query's rail ways and station nodes into
 * `LineString`/`Point` features (relation elements are skipped — Gautrain
 * rail has no route relations, only tagged ways/nodes).
 */
export function normalizeGautrainOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeWayNodeTransitOverpass(raw, "Gautrain");
}

/** Normalizes a Gautrain Bus Overpass query's route relations into `LineString` features. */
export function normalizeGautrainBusOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeRelationTransitOverpass(raw, "Gautrain Bus");
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

  /* v8 ignore next 3 -- unreachable: waitTurn only rejects if sleep() throws, which it never does */
  overpassRequestQueue = waitTurn.catch(() => {
    return;
  });

  await waitTurn;
}

/**
 * Runs an Overpass QL query against a public Overpass instance, with
 * disk caching, rate-limiting, and cross-mirror retry.
 * @remarks Retries with backoff on a single mirror before rotating to the
 *   next one (see `constants/serviceUrls.ts`) on repeated 429/504
 *   responses, since a single public Overpass instance can be temporarily
 *   rate-limited or overloaded while others are not. Falls back to a stale
 *   cached response if every retry attempt is exhausted.
 * @param attempt - Internal retry counter; callers should omit it.
 */
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
  /* v8 ignore next 3 -- unreachable: (attempt - 1) % urls.length is always a valid index once urls.length > 0 is confirmed above */
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

/** Fetches Gautrain rail ways and station nodes within `bbox` via Overpass. */
export async function fetchGautrainRail(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(gautrainQuery(bbox));
}

/** Fetches Gautrain Bus route relations within `bbox` via Overpass. */
export async function fetchGautrainBusRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(gautrainBusQuery(bbox));
}
