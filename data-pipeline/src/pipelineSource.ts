import type { MetroDefinition } from "@stratum/app";
import type { FeatureCollection } from "geojson";

export interface PipelineSource {
  layerId: string;
  regionId: string;
  fetch(): Promise<FeatureCollection>;
  outputFileName: string;
}

export interface RegionPipelineConfig {
  regionId: string;
  metros: MetroDefinition[];
  sources: PipelineSource[];
}
