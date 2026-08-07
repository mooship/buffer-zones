import type { TransitLayerFeatureCollection, TransitStop } from "@karta/app";
import type { OverpassResponse } from "./gautrain";

/**
 * Normalizes an Overpass response's `relation` elements (OSM public
 * transport routes, each grouping several `way` members) into one
 * `LineString` feature per relation member way, deduplicated across
 * relations that share a way.
 * @param network - Value written to every produced feature's `network` property.
 */
export function normalizeRelationTransitOverpass(
  raw: OverpassResponse,
  network: string,
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
      network,
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

/**
 * Normalizes an Overpass response's `way` and `node` elements into
 * `LineString`/`Point` features. `relation` elements, if present, are skipped.
 * @param network - Value written to every produced feature's `network` property.
 */
export function normalizeWayNodeTransitOverpass(
  raw: OverpassResponse,
  network: string,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    const stop: TransitStop = {
      id: `${element.type}/${element.id}`,
      name: element.tags?.name ?? "Unnamed",
      network,
    };

    if (element.type === "way") {
      features.push({
        type: "Feature",
        properties: stop,
        geometry: {
          type: "LineString",
          coordinates: element.geometry.map(
            (point) => [point.lon, point.lat] as [number, number],
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
