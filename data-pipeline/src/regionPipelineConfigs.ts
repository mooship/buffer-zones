import type { RegionPipelineConfig } from "./pipelineSource";
import { GAUTENG_PIPELINE_CONFIG } from "./regions/gautengPipelineConfig";

/** Every region the data pipeline is configured to produce a dataset for. */
export const REGION_PIPELINE_CONFIGS: RegionPipelineConfig[] = [
  GAUTENG_PIPELINE_CONFIG,
];

/**
 * Looks up a region's pipeline config by id.
 * @throws If `regionId` isn't in `REGION_PIPELINE_CONFIGS`.
 */
export function getRegionPipelineConfig(
  regionId: string,
): RegionPipelineConfig {
  const config = REGION_PIPELINE_CONFIGS.find(
    (candidate) => candidate.regionId === regionId,
  );
  if (!config) {
    throw new Error(`No pipeline config registered for region: ${regionId}`);
  }
  return config;
}
