import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Tshwane/Gauteng bounding box (south, west, north, east), covers the Pretoria PRASA commuter lines
const TSHWANE_BBOX = "-25.95,28.05,-25.55,28.40";

// Rail ways carry operator=PRASA; stations are tagged network=Metrorail Gauteng (verified 2026-07-28).
const PRASA_QUERY = `
[out:json][timeout:60];
(
  way["railway"="rail"]["operator"~"PRASA|Metrorail",i](${TSHWANE_BBOX});
  node["railway"="station"]["network"~"Metrorail",i](${TSHWANE_BBOX});
  node["railway"="station"]["operator"~"PRASA|Metrorail",i](${TSHWANE_BBOX});
);
out geom;
`;

export function normalizePrasaOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    const stop: TransitStop = {
      id: `${element.type}/${element.id}`,
      name: element.tags?.name ?? "Unnamed",
      network: "PRASA",
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

export async function fetchPrasaRail(): Promise<OverpassResponse> {
  return fetchOverpass(OVERPASS_URL, PRASA_QUERY);
}
