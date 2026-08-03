import { REGIONS } from "@stratum/app";

/**
 * Builds one `/data/<regionId>/<fileName>` URL per configured region, for a
 * layer's `dataSource` array. `@stratum/core`'s `fetchFeatureCollection` (via
 * `mergeFeatureCollections`) fetches every URL and merges the results into
 * one `FeatureCollection`.
 */
export function buildRegionDataUrls(fileName: string): string[] {
  return REGIONS.map((region) => `/data/${region.id}/${fileName}`);
}
