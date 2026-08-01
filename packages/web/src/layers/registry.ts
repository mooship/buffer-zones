import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/shared";
import type { Layer, LayerGroup } from "@stratum/shared";

export function getLayers(): readonly Layer[] {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layers;
}

export function getLayer(id: string): Layer | undefined {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layers.find((layer) => layer.id === id);
}

export function getLayerGroups(): readonly LayerGroup[] {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layerGroups;
}
