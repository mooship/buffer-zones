import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Tshwane/Gauteng bounding box (south, west, north, east), covers the Pretoria portion of the Gautrain network
const TSHWANE_BBOX = "-25.95,28.05,-25.55,28.40";

const GAUTRAIN_QUERY = `
[out:json][timeout:60];
(
  way["railway"="rail"]["operator"~"Gautrain",i](${TSHWANE_BBOX});
  way["railway"="rail"]["gauge"="1435"](${TSHWANE_BBOX});
  node["railway"="station"]["operator"~"Gautrain",i](${TSHWANE_BBOX});
);
out geom;
`;

const GAUTRAIN_BUS_QUERY = `
[out:json][timeout:60];
relation["route"="bus"]["operator"~"Gautrain",i](${TSHWANE_BBOX});
out geom;
`;

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

// The public overpass-api.de instance was observed returning intermittent
// 406/504 responses (load-balanced across backends, occasionally overloaded)
// during manual verification on 2026-07-28; sending a descriptive User-Agent
// plus retrying with backoff resolved it reliably in testing.
export async function fetchOverpass(
  url: string,
  query: string,
  attempt = 1,
): Promise<OverpassResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "buffer-zones-data-pipeline (github.com/buffer-zones)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    if ((response.status === 504 || response.status === 429) && attempt < 4) {
      await sleep(2000 * attempt);
      return fetchOverpass(url, query, attempt + 1);
    }
    throw new Error(`Overpass query failed: ${response.status}`);
  }
  return (await response.json()) as OverpassResponse;
}

export async function fetchGautrainRail(): Promise<OverpassResponse> {
  return fetchOverpass(OVERPASS_URL, GAUTRAIN_QUERY);
}

export async function fetchGautrainBusRoutes(): Promise<OverpassResponse> {
  return fetchOverpass(OVERPASS_URL, GAUTRAIN_BUS_QUERY);
}
