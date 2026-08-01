import type { RegionPipelineConfig } from "./pipelineSource";
import { GAUTENG_PIPELINE_CONFIG } from "./regions/gautengPipelineConfig";

export const REGION_PIPELINE_CONFIGS: RegionPipelineConfig[] = [
  GAUTENG_PIPELINE_CONFIG,
];

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
