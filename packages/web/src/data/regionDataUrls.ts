import { REGIONS } from "@stratum/shared";

export function buildRegionDataUrls(fileName: string): string[] {
  return REGIONS.map((region) => `/data/${region.id}/${fileName}`);
}
