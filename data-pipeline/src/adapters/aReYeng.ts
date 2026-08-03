import type { TransitLayerFeatureCollection, TransitStop } from "@stratum/app";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
} from "geojson";
import { fetchOverpass, type OverpassResponse } from "./gautrain";

// Source: City of Tshwane Open Data / e-GIS ArcGIS Server, "Other_WS/BRT_A_Re_Yeng"
// MapServer. Verified reachable and returning real route geometry via GeoJSON export
// on 2026-07-28. Fetches all three service tiers so the layer isn't limited to trunk
// corridors alone — many township areas are only reachable via feeder routes, and
// showing trunk-only risked making those areas look unserved by transit when they
// are not:
//   - layer 8: trunk routes (3 features verified: Line 1A, Line 2A, Line 2B)
//   - layer 9: complementary routes
//   - layer 10: feeder routes
const AREYENG_LAYERS = [8, 9, 10] as const;

function areYengLayerUrl(layer: number): string {
  return `https://e-gis001.tshwane.gov.za/server/rest/services/Other_WS/BRT_A_Re_Yeng/MapServer/${layer}/query?where=1%3D1&outFields=*&f=geojson`;
}

const TSHWANE_BBOX = "-25.95,28.05,-25.55,28.40";
// Restricted to busway/bus-route ways (not just any element tagged
// network="A Re Yeng") so a station building isn't picked up and rendered as a
// fake route line. OSM coverage for feeder/complementary geometry is sparse, so this
// fallback (used only if the portal is unreachable) may still be trunk-heavy.
const AREYENG_OVERPASS_QUERY = `
[out:json][timeout:60];
(
  way["network"="A Re Yeng"]["highway"="busway"](${TSHWANE_BBOX});
  way["network"="A Re Yeng"]["route"="bus"](${TSHWANE_BBOX});
);
out geom;
`;

// The open-data-portal source is served by an ArcGIS MapServer, so raw properties may
// come back either in the brief's generic ROUTE_ID/ROUTE_NAME shape or in the real
// service's ArcGIS field names (OBJECTID/Route_Code/Route_Description/Label). Accept
// both so the normalizer works against the live source as well as simpler fixtures.
interface RawAReYengProperties {
  ROUTE_ID?: string;
  ROUTE_NAME?: string;
  OBJECTID?: number;
  Route_Code?: string;
  Route_Description?: string;
  Label?: string;
}

function resolveId(props: RawAReYengProperties): string {
  if (props.ROUTE_ID !== undefined) {
    return props.ROUTE_ID;
  }
  if (props.OBJECTID !== undefined) {
    return String(props.OBJECTID);
  }
  return "unknown";
}

function resolveName(props: RawAReYengProperties): string {
  return (
    props.ROUTE_NAME ??
    props.Route_Code ??
    props.Route_Description ??
    props.Label ??
    "Unnamed"
  );
}

/**
 * Normalizes A Re Yeng's open-data-portal GeoJSON export into
 * `LineString` features, splitting any `MultiLineString` into its
 * constituent parts rather than concatenating them.
 */
export function normalizeAReYeng(
  raw: FeatureCollection,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const feature of raw.features) {
    const props = (feature.properties ?? {}) as RawAReYengProperties;
    const stop: TransitStop = {
      id: resolveId(props),
      name: resolveName(props),
      network: "A Re Yeng",
    };

    const geometry = feature.geometry as Geometry;

    if (geometry.type === "MultiLineString") {
      // Split each part of a MultiLineString into its own LineString feature rather
      // than concatenating coordinates, which would draw phantom segments between
      // disjoint branches. All parts share the same route id.
      for (const part of (geometry as MultiLineString).coordinates) {
        features.push({
          type: "Feature",
          properties: stop,
          geometry: {
            type: "LineString",
            coordinates: part.map((p) => [p[0], p[1]] as [number, number]),
          },
        });
      }
    } else if (geometry.type === "LineString") {
      const line = geometry as LineString;
      features.push({
        type: "Feature",
        properties: stop,
        geometry: {
          type: "LineString",
          coordinates: line.coordinates.map(
            (p) => [p[0], p[1]] as [number, number],
          ),
        },
      } as Feature<LineString, TransitStop>);
    }
  }

  return { type: "FeatureCollection", features };
}

/** Normalizes the Overpass fallback query's busway/bus-route ways into `LineString` features. */
export function normalizeAReYengOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    if (element.type !== "way") {
      continue;
    }
    const stop: TransitStop = {
      id: `way/${element.id}`,
      name: element.tags?.name ?? "Unnamed",
      network: "A Re Yeng",
    };
    features.push({
      type: "Feature",
      properties: stop,
      geometry: {
        type: "LineString",
        coordinates: element.geometry.map(
          (p) => [p.lon, p.lat] as [number, number],
        ),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * Fetches A Re Yeng routes from the City of Tshwane open-data portal
 * (trunk, complementary, and feeder layers merged), falling back to the
 * (trunk-heavy) Overpass query if the portal is unreachable or returns an
 * unexpected shape.
 * @returns The portal's raw `FeatureCollection` (pass to `normalizeAReYeng`)
 *   or the Overpass fallback's `OverpassResponse` (pass to `normalizeAReYengOverpass`).
 */
export async function fetchAReYengRoutes(): Promise<
  FeatureCollection | OverpassResponse
> {
  const merged: Feature[] = [];

  try {
    for (const layer of AREYENG_LAYERS) {
      const portalResponse = await fetch(areYengLayerUrl(layer));
      if (!portalResponse.ok) {
        throw new Error(`A Re Yeng layer ${layer} request failed`);
      }
      const collection: unknown = await portalResponse.json();
      if (
        collection === null ||
        typeof collection !== "object" ||
        (collection as { type?: unknown }).type !== "FeatureCollection" ||
        !Array.isArray((collection as { features?: unknown }).features)
      ) {
        throw new Error(
          `A Re Yeng layer ${layer} returned an unexpected shape`,
        );
      }
      merged.push(...(collection as FeatureCollection).features);
    }
    return { type: "FeatureCollection", features: merged };
  } catch (error) {
    // fall through to the Overpass fallback below on any network/TLS/shape failure
    // for any of the three layers, so the layer is all-or-nothing per source.
    console.warn(
      "A Re Yeng open-data-portal fetch failed, falling back to Overpass",
      error,
    );
  }

  return fetchOverpass(AREYENG_OVERPASS_QUERY);
}
