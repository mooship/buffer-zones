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
  node["railway"="station"]["operator"~"Gautrain",i](${TSHWANE_BBOX});
);
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

export type OverpassElement = OverpassWayElement | OverpassNodeElement;
export interface OverpassResponse {
  elements: OverpassElement[];
}

export function normalizeGautrainOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
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

export async function fetchGautrainRail(): Promise<OverpassResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(GAUTRAIN_QUERY)}`,
  });
  if (!response.ok) {
    throw new Error(`Overpass query failed: ${response.status}`);
  }
  return (await response.json()) as OverpassResponse;
}
