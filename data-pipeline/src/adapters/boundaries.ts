import * as turf from "@turf/turf";
import AdmZip from "adm-zip";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";
import * as shapefile from "shapefile";

// Source: Statistics South Africa Census 2011 sub-place boundaries (SP_SA_2011
// shapefile), mirrored as a zip in the community-maintained "SA-Maps" GitHub
// repository (chosen because statssa.gov.za does not expose a direct,
// scriptable download link; Adrian Frith's public repos were checked and do
// not host a ready-made sub-place boundary GeoJSON/shapefile for Tshwane).
// Verified working (HTTP 200, valid zip containing SP_SA_2011.shp/.dbf/.shx,
// City of Tshwane records present with MN_CODE 799) on 2026-07-27.
// https://github.com/j-norwood-young/SA-Maps/raw/master/Subplace.zip
const BOUNDARY_SOURCE_URL =
  "https://github.com/j-norwood-young/SA-Maps/raw/master/Subplace.zip";

// City of Tshwane's municipality code (MN_CODE) in the Stats SA Census 2011
// sub-place shapefile.
const TSHWANE_MUNICIPALITY_CODE = 799;

const SHP_ENTRY_NAME = "Subplace/SP_SA_2011.shp";
const DBF_ENTRY_NAME = "Subplace/SP_SA_2011.dbf";

export interface RawSubPlaceProperties {
  SP_CODE: string;
  SP_NAME: string;
  TotalPop?: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface NormalizedTownship {
  id: string;
  name: string;
  population: number | undefined;
  centroid: LatLon;
  geometry: Polygon | MultiPolygon;
}

export function normalizeBoundaries(
  raw: FeatureCollection,
): NormalizedTownship[] {
  return raw.features.map((feature) => {
    const props = feature.properties as RawSubPlaceProperties;
    const geometry = feature.geometry as Polygon | MultiPolygon;
    const centroidFeature = turf.centroid(
      feature as Feature<Polygon | MultiPolygon>,
    );
    const [lon, lat] = centroidFeature.geometry.coordinates as [number, number];

    return {
      id: props.SP_CODE,
      name: props.SP_NAME,
      population: props.TotalPop,
      centroid: { lat, lon },
      geometry,
    };
  });
}

/**
 * Extracts the sub-place shapefile pair (.shp/.dbf) from the zip archive and
 * converts it to a GeoJSON FeatureCollection, filtered down to City of
 * Tshwane sub-places only.
 */
export async function convertShapefileToGeoJSON(
  zipBuffer: Buffer,
): Promise<FeatureCollection> {
  const zip = new AdmZip(zipBuffer);
  const shpEntry = zip.getEntry(SHP_ENTRY_NAME);
  const dbfEntry = zip.getEntry(DBF_ENTRY_NAME);

  if (!shpEntry || !dbfEntry) {
    throw new Error(
      `Expected ${SHP_ENTRY_NAME} and ${DBF_ENTRY_NAME} entries in the boundary zip archive`,
    );
  }

  const shpBuffer = shpEntry.getData();
  const dbfBuffer = dbfEntry.getData();

  const collection: FeatureCollection = await shapefile.read(
    shpBuffer,
    dbfBuffer,
  );

  const features: Feature[] = collection.features
    .filter(
      (feature) =>
        (feature.properties as Record<string, unknown> | null)?.MN_CODE ===
        TSHWANE_MUNICIPALITY_CODE,
    )
    .map((feature) => {
      const rawProps = feature.properties as Record<string, unknown> | null;
      const properties: RawSubPlaceProperties = {
        SP_CODE: String(rawProps?.SP_CODE),
        SP_NAME: String(rawProps?.SP_NAME),
        // The Stats SA sub-place shapefile does not carry a population
        // field; population is left undefined for real fetches and is
        // only populated by other, richer sources in tests.
      };
      return { ...feature, properties };
    });

  return { ...collection, features };
}

export async function fetchTshwaneBoundaries(): Promise<FeatureCollection> {
  const response = await fetch(BOUNDARY_SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Tshwane boundaries: ${response.status}`);
  }
  const zipBuffer = Buffer.from(await response.arrayBuffer());
  return convertShapefileToGeoJSON(zipBuffer);
}
