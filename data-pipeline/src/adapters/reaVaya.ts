import type { TransitLayerFeatureCollection } from "@stratum/app";
import { fetchOverpass, type OverpassResponse } from "./gautrain";
import { normalizeRelationTransitOverpass } from "./overpassNormalizers";

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

/** Normalizes a Rea Vaya Overpass query's route relations into `LineString` features. */
export function normalizeReaVayaOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeRelationTransitOverpass(raw, "Rea Vaya");
}

/** Fetches Rea Vaya route relations within `bbox` via Overpass. */
export async function fetchReaVayaRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(reaVayaQuery(bbox));
}
