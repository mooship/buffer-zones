import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";

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
