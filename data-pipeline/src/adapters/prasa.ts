import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@stratum/shared";
import { fetchOverpass, type OverpassResponse } from "./gautrain";

// Rail ways carry operator=PRASA; stations are tagged network=Metrorail Gauteng (verified 2026-07-28).
function prasaQuery(bbox: string): string {
  return `
[out:json][timeout:60];
(
  relation["route"="train"]["operator"~"PRASA|Metrorail",i](${bbox});
  relation["route"="train"]["network"~"Metrorail",i](${bbox});
)->.routes;
(
  way(r.routes);
  way["railway"="rail"]["operator"~"PRASA|Metrorail",i](${bbox});
  node["railway"="station"]["network"~"Metrorail",i](${bbox});
  node["railway"="station"]["operator"~"PRASA|Metrorail",i](${bbox});
);
out geom;
`;
}

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
    } else if (element.type === "node") {
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

export async function fetchPrasaRail(bbox: string): Promise<OverpassResponse> {
  return fetchOverpass(prasaQuery(bbox));
}
