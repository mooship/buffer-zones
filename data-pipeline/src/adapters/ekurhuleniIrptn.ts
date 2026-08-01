import type {
  TransitLayerFeatureCollection,
  TransitStop,
} from "@stratum/shared";
import type {
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
} from "geojson";

const EKURHULENI_IRPTN_URL =
  "https://gis.ekurhuleni.gov.za/arcgis/rest/services/Ekurhuleni/Ekurhuleni_Transportation_Map_v1/MapServer/2/query";
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 90_000;
const PAGE_DELAY_MS = 1_500;

interface RawIrptnProperties {
  OBJECTID?: number;
  Id?: number;
  Name?: string;
}

interface ArcGisGeoJsonResponse extends FeatureCollection {
  exceededTransferLimit?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createQueryUrl(resultOffset: number): string {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    orderByFields: "OBJECTID",
    outSR: "4326",
    resultOffset: String(resultOffset),
    resultRecordCount: String(PAGE_SIZE),
    f: "geojson",
  });

  return `${EKURHULENI_IRPTN_URL}?${params.toString()}`;
}

function isFeatureCollection(value: unknown): value is ArcGisGeoJsonResponse {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const candidate = value as { type?: unknown; features?: unknown };
  return (
    candidate.type === "FeatureCollection" && Array.isArray(candidate.features)
  );
}

function resolveId(props: RawIrptnProperties): string {
  if (props.OBJECTID !== undefined) {
    return String(props.OBJECTID);
  }
  if (props.Id !== undefined) {
    return String(props.Id);
  }
  return "unknown";
}

function resolveName(props: RawIrptnProperties): string {
  if (props.Name !== undefined && props.Name.length > 0) {
    return props.Name;
  }
  return "Unnamed";
}

export function normalizeEkurhuleniIrptn(
  raw: FeatureCollection,
): TransitLayerFeatureCollection {
  const features: TransitLayerFeatureCollection["features"] = [];

  for (const feature of raw.features) {
    const props = (feature.properties ?? {}) as RawIrptnProperties;
    const stop: TransitStop = {
      id: resolveId(props),
      name: resolveName(props),
      network: "Ekurhuleni IRPTN",
    };
    const geometry = feature.geometry as Geometry;

    if (geometry.type === "MultiLineString") {
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
    }

    if (geometry.type === "LineString") {
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
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export async function fetchEkurhuleniIrptnRoutes(): Promise<FeatureCollection> {
  const features = [];
  let resultOffset = 0;
  let exceededTransferLimit = false;

  do {
    if (resultOffset > 0) {
      await sleep(PAGE_DELAY_MS);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const response = await fetch(createQueryUrl(resultOffset), {
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout);
    });

    if (!response.ok) {
      throw new Error(
        `Ekurhuleni IRPTN request failed with status ${response.status}`,
      );
    }

    const collection: unknown = await response.json();
    if (!isFeatureCollection(collection)) {
      throw new Error("Ekurhuleni IRPTN returned an unexpected shape");
    }

    features.push(...collection.features);
    exceededTransferLimit = collection.exceededTransferLimit === true;
    resultOffset += PAGE_SIZE;
  } while (exceededTransferLimit);

  return { type: "FeatureCollection", features };
}
