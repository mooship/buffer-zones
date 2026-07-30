import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";
import { normalizeRelationTransitOverpass } from "./relationTransit";

function tshwaneBusQuery(bbox: string): string {
  return `
[out:json][timeout:60];
(
  relation["route"="bus"]["operator"~"Tshwane Bus",i](${bbox});
  relation["route"="bus"]["network"~"Tshwane Bus",i](${bbox});
);
out geom;
`;
}

export function normalizeTshwaneBusOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeRelationTransitOverpass(raw, "Tshwane Bus Services");
}

export async function fetchTshwaneBusRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  try {
    return await fetchOverpass(tshwaneBusQuery(bbox));
  } catch {
    return { elements: [] };
  }
}
