import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";
import { normalizeRelationTransitOverpass } from "./relationTransit";

// No open-data portal found (unlike A Re Yeng's Tshwane e-GIS MapServer), so
// Overpass-only. Rea Vaya tags network/route on the route RELATION, not on
// member ways, so this mirrors gautrain.ts's Gautrain Bus pattern instead of
// A Re Yeng's way-tag pattern.
function reaVayaQuery(bbox: string): string {
  return `
[out:json][timeout:60];
relation["route"="bus"]["network"~"Rea Vaya",i](${bbox});
out geom;
`;
}

export function normalizeReaVayaOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeRelationTransitOverpass(raw, "Rea Vaya");
}

export async function fetchReaVayaRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(reaVayaQuery(bbox));
}
