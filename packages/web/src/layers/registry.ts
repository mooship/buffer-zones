import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import type { Layer, LayerGroup } from "@stratum/core";
import { createRegistry } from "@stratum/core";

const registry = createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN);

/** Returns every layer in the `gauteng-spatial-legacy` domain. */
export function getLayers(): readonly Layer[] {
  return registry.getLayers();
}

/** Returns the layer with the given id, or `undefined` if not found. */
export function getLayer(id: string): Layer | undefined {
  return registry.getLayer(id);
}

/** Returns every layer group in the `gauteng-spatial-legacy` domain. */
export function getLayerGroups(): readonly LayerGroup[] {
  return registry.getLayerGroups();
}
