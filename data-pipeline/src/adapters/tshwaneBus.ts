import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";

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
  const features: TransitLayerFeatureCollection["features"] = [];
  const seenMembers = new Set<string>();

  for (const element of raw.elements) {
    if (element.type !== "relation") {
      continue;
    }

    const route: TransitStop = {
      id: `relation/${element.id}`,
      name: element.tags?.name ?? element.tags?.ref ?? "Unnamed",
      network: "Tshwane Bus Services",
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

export async function fetchTshwaneBusRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  try {
    return await fetchOverpass(tshwaneBusQuery(bbox));
  } catch {
    return { elements: [] };
  }
}
