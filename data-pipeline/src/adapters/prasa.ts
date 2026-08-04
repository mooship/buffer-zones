import type { TransitLayerFeatureCollection } from "@stratum/app";
import { fetchOverpass, type OverpassResponse } from "./gautrain";
import { normalizeWayNodeTransitOverpass } from "./overpassNormalizers";

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

/** Normalizes a PRASA/Metrorail Overpass query's rail ways and station nodes into `LineString`/`Point` features. */
export function normalizePrasaOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  return normalizeWayNodeTransitOverpass(raw, "PRASA");
}

/** Fetches PRASA/Metrorail rail ways and station nodes within `bbox` via Overpass. */
export async function fetchPrasaRail(bbox: string): Promise<OverpassResponse> {
  return fetchOverpass(prasaQuery(bbox));
}
