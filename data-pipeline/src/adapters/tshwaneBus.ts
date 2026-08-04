import type { TransitLayerFeatureCollection } from "@stratum/app";
import { fetchOverpass, type OverpassResponse } from "./gautrain";
import { normalizeRelationTransitOverpass } from "./overpassNormalizers";

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

/** Normalizes a Tshwane Bus Services Overpass query's route relations into `LineString` features. */
export function normalizeTshwaneBusOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeRelationTransitOverpass(raw, "Tshwane Bus Services");
}

/**
 * Fetches Tshwane Bus Services route relations within `bbox` via Overpass.
 * @returns An empty `OverpassResponse` (rather than throwing) if the Overpass
 *   query fails, so a missing Tshwane Bus layer doesn't fail the whole pipeline run.
 */
export async function fetchTshwaneBusRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  try {
    return await fetchOverpass(tshwaneBusQuery(bbox));
  } catch {
    return { elements: [] };
  }
}
