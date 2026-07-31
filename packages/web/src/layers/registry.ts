import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@buffer-zones/shared";
import type { Layer, LayerGroup } from "@buffer-zones/shared";

export function getLayers(): readonly Layer[] {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layers;
}

export function getLayer(id: string): Layer | undefined {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layers.find((layer) => layer.id === id);
}

export function getLayerGroups(): readonly LayerGroup[] {
  return GAUTENG_SPATIAL_LEGACY_DOMAIN.layerGroups;
}
