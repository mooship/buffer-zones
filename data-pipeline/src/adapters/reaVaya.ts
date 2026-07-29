import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";

// Rea Vaya is the City of Johannesburg's own BRT system (the Johannesburg
// equivalent of Tshwane's A Re Yeng). No public open-data portal export was
// found for it (unlike A Re Yeng's City of Tshwane e-GIS MapServer), so this
// adapter is Overpass-only. Verified against a live Overpass query on
// 2026-07-29: unlike A Re Yeng, Rea Vaya's OSM coverage tags `network="Rea
// Vaya"`/`route="bus"` on route RELATIONS (e.g. "BRT T1: Ellis Park East =>
// Thokoza Park"), not on individual ways — the member ways themselves carry
// no distinguishing tag at all. So this mirrors `gautrain.ts`'s Gautrain Bus
// pattern (relation members extracted into LineStrings) rather than A Re
// Yeng's way-tag pattern.
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
  const features: TransitLayerFeatureCollection["features"] = [];
  const seenMembers = new Set<string>();

  for (const element of raw.elements) {
    if (element.type !== "relation") {
      continue;
    }
    const route: TransitStop = {
      id: `relation/${element.id}`,
      name: element.tags?.name ?? element.tags?.ref ?? "Unnamed",
      network: "Rea Vaya",
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

export async function fetchReaVayaRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  return fetchOverpass(reaVayaQuery(bbox));
}
