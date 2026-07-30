import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import { hashKey, readJsonCache, writeJsonCache } from "../cache";
import { getOverpassUrls } from "../constants/serviceUrls";

const OVERPASS_TIMEOUT_MS = 45_000;
const OVERPASS_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

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
  const features: TransitLayerFeatureCollection["features"] = [];
  const seenMembers = new Set<string>();

  for (const element of raw.elements) {
    if (element.type !== "relation") {
      continue;
    }
    const route: TransitStop = {
      id: `relation/${element.id}`,
      name: element.tags?.name ?? element.tags?.ref ?? "Unnamed",
      network: "Gautrain Bus",
    };
    for (const member of element.members) {
      const memberId = `${element.id}/${member.ref}`;
      if (
        member.type !== "way" ||
        !member.geometry ||
        seenMembers.has(memberId)
      ) {
        continue;
      }
      seenMembers.add(memberId);
      features.push({
        type: "Feature",
        properties: route,
        geometry: {
          type: "LineString",
          coordinates: member.geometry.map(
            (point) => [point.lon, point.lat] as [number, number],
          ),
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * 500);
  return 2000 * attempt + jitter;
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
  const url =
    urls[(attempt - 1) % urls.length] ??
    urls[0] ??
    "https://overpass-api.de/api/interpreter";
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
