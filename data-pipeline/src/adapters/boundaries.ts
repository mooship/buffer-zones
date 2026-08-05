import { getMetroDefinition, type MetroId } from "@stratum/app";
import { reprojectFeatureCollection } from "@stratum/core";
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
// City of Tshwane records present with MN_CODE 799, City of Johannesburg
// records present with MN_CODE 798) on 2026-07-27 (Tshwane) and 2026-07-29
// (Johannesburg).
// https://github.com/j-norwood-young/SA-Maps/raw/master/Subplace.zip
const BOUNDARY_SOURCE_URL =
  "https://github.com/j-norwood-young/SA-Maps/raw/master/Subplace.zip";

const SHP_ENTRY_NAME = "Subplace/SP_SA_2011.shp";
const DBF_ENTRY_NAME = "Subplace/SP_SA_2011.dbf";

/** A Census 2011 sub-place feature's properties, as they appear in the source shapefile. */
export interface RawSubPlaceProperties {
  SP_CODE: string;
  SP_NAME: string;
  TotalPop?: number;
}

/** A geographic point in decimal degrees. */
export interface LatLon {
  lat: number;
  lon: number;
}

/** A sub-place boundary, normalized into the shape the rest of the pipeline works with. */
export interface NormalizedTownship {
  id: string;
  name: string;
  population: number | undefined;
  /** The boundary's centroid, used as the routing origin for job-centre drive-time queries. */
  centroid: LatLon;
  geometry: Polygon | MultiPolygon;
}

/**
 * Normalizes a raw sub-place `FeatureCollection` (as produced by
 * `convertShapefileToGeoJSON`/`filterFeaturesByMunicipality`) into
 * `NormalizedTownship`s, computing each feature's centroid via Turf.
 */
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
 * Pure transform: filters a national sub-place FeatureCollection down to a
 * single metro's records only (matching on the shapefile's MN_CODE
 * municipality field) and remaps each feature's properties to the
 * RawSubPlaceProperties shape. Contains no I/O, so it can be unit tested
 * against a small in-memory fixture without touching the network.
 */
export function filterFeaturesByMunicipality(
  collection: FeatureCollection,
  municipalityCodes: readonly number[],
): FeatureCollection {
  const municipalityCodeSet = new Set(municipalityCodes);
  const features: Feature[] = collection.features
    .filter((feature) =>
      municipalityCodeSet.has(
        Number((feature.properties as Record<string, unknown> | null)?.MN_CODE),
      ),
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

/**
 * Extracts the sub-place shapefile pair (.shp/.dbf) from the zip archive and
 * converts it to a GeoJSON FeatureCollection, filtered down to a single
 * metro's sub-places only. I/O-bound (zip extraction + shapefile parsing);
 * the filtering logic itself lives in the pure, separately-tested
 * `filterFeaturesByMunicipality`.
 * @param sourceCrs - A proj4-compatible definition string for the
 *   shapefile's coordinate reference system, if it isn't already WGS84 (see
 *   `HARTEBEESTHOEK94_LO29` for a common South African example). Omit when
 *   the source is already WGS84 lon/lat, which is the case for today's
 *   Census 2011 sub-place source.
 */
export async function convertShapefileToGeoJSON(
  zipBuffer: Buffer,
  municipalityCodes: readonly number[],
  sourceCrs?: string,
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

  const filtered = filterFeaturesByMunicipality(collection, municipalityCodes);
  return sourceCrs ? reprojectFeatureCollection(filtered, sourceCrs) : filtered;
}

/**
 * Fetches the national sub-place boundary shapefile zip and returns just
 * `metroId`'s sub-place features, via `convertShapefileToGeoJSON`.
 * @param sourceCrs - Forwarded to `convertShapefileToGeoJSON`; see its docs.
 * @throws If the network fetch fails.
 */
export async function fetchMetroBoundaries(
  metroId: MetroId,
  sourceCrs?: string,
): Promise<FeatureCollection> {
  const response = await fetch(BOUNDARY_SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch metro boundaries: ${response.status}`);
  }
  const zipBuffer = Buffer.from(await response.arrayBuffer());
  return convertShapefileToGeoJSON(
    zipBuffer,
    getMetroDefinition(metroId).municipalityCodes,
    sourceCrs,
  );
}
