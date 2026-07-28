import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@buffer-zones/shared";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
} from "geojson";
import { type OverpassResponse, fetchOverpass } from "./gautrain";

// Source: City of Tshwane Open Data / e-GIS ArcGIS Server, "Other_WS/BRT_A_Re_Yeng"
// MapServer, layer 8 ("A Re Yeng Trunk Route"). Verified reachable and returning real
// trunk-route geometry (3 features: Line 1A, Line 2A, Line 2B) via GeoJSON export on
// 2026-07-28. Covers trunk routes only; feeder (layer 10) and complementary (layer 9)
// routes are separate layers not included in this v1 fetch.
const AREYENG_SOURCE_URL =
  "https://e-gis001.tshwane.gov.za/server/rest/services/Other_WS/BRT_A_Re_Yeng/MapServer/8/query?where=1%3D1&outFields=*&f=geojson";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TSHWANE_BBOX = "-25.95,28.05,-25.55,28.40";
// Restricted to busway/bus-route ways (not just any element tagged
// network="A Re Yeng") so a station building isn't picked up and rendered as a
// fake route line. See task-5-report.md: OSM coverage for actual A Re Yeng route
// geometry was found to be effectively empty at verification time.
const AREYENG_OVERPASS_QUERY = `
[out:json][timeout:60];
way["network"="A Re Yeng"]["highway"="busway"](${TSHWANE_BBOX});
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
  if (props.ROUTE_ID !== undefined) return props.ROUTE_ID;
  if (props.OBJECTID !== undefined) return String(props.OBJECTID);
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

export function normalizeAReYengOverpass(
  raw: OverpassResponse,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const element of raw.elements) {
    if (element.type !== "way") continue;
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

export async function fetchAReYengRoutes(): Promise<
  FeatureCollection | OverpassResponse
> {
  try {
    const portalResponse = await fetch(AREYENG_SOURCE_URL);
    if (portalResponse.ok) {
      const json: unknown = await portalResponse.json();
      // ArcGIS Server returns HTTP 200 with an `{"error": {...}}` body on most
      // failures (bad params, service down), so a 200 status alone doesn't mean
      // valid data. Confirm the shape is really a FeatureCollection before trusting it.
      if (
        json !== null &&
        typeof json === "object" &&
        (json as { type?: unknown }).type === "FeatureCollection" &&
        Array.isArray((json as { features?: unknown }).features)
      ) {
        return json as FeatureCollection;
      }
    }
  } catch {
    // fall through to the Overpass fallback below on any network/TLS failure
  }

  return fetchOverpass(OVERPASS_URL, AREYENG_OVERPASS_QUERY);
}
