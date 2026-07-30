import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import { type OverpassResponse, fetchOverpass } from "./gautrain";

function metrobusQuery(bbox: string): string {
  return `
[out:json][timeout:60];
(
  relation["route"="bus"]["operator"~"Metrobus",i](${bbox});
  relation["route"="bus"]["network"~"Metrobus",i](${bbox});
);
out geom;
`;
}

export function normalizeMetrobusOverpass(
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
      network: "Metrobus",
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

export async function fetchMetrobusRoutes(
  bbox: string,
): Promise<OverpassResponse> {
  try {
    return await fetchOverpass(metrobusQuery(bbox));
  } catch {
    return { elements: [] };
  }
}
