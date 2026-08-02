import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import type { Layer, LayerGroup } from "@stratum/core";
import { createRegistry } from "@stratum/core";

const registry = createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN);

export function getLayers(): readonly Layer[] {
  return registry.getLayers();
}

export function getLayer(id: string): Layer | undefined {
  return registry.getLayer(id);
}

export function getLayerGroups(): readonly LayerGroup[] {
  return registry.getLayerGroups();
}
