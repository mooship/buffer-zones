import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@karta/app";
import type { DomainStory, Layer, LayerGroup } from "@karta/core";
import { createRegistry } from "@karta/core";

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

/** Returns the `gauteng-spatial-legacy` domain's story copy, or `undefined` if it has none. */
export function getStory(): DomainStory | undefined {
  return registry.getStory();
}
