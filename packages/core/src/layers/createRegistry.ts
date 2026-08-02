import type { DomainConfig, Layer, LayerGroup } from "../types/layer";

/** The read-only accessor interface returned by `createRegistry`. */
export interface DomainRegistry {
  /** Returns all layers in the domain. */
  getLayers(): readonly Layer[];
  /** Returns the layer with the given id, or `undefined` if not found. */
  getLayer(id: string): Layer | undefined;
  /** Returns all layer groups in the domain. */
  getLayerGroups(): readonly LayerGroup[];
}

/**
 * Creates a read-only registry for a domain configuration.
 * @param domain - The domain whose layers and groups to expose.
 * @returns An object with `getLayers`, `getLayer`, and `getLayerGroups`.
 * @example
 * const { getLayers, getLayer, getLayerGroups } = createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN);
 */
export function createRegistry(domain: DomainConfig): DomainRegistry {
  return {
    getLayers: (): readonly Layer[] => domain.layers,
    getLayer: (id: string): Layer | undefined =>
      domain.layers.find((l) => l.id === id),
    getLayerGroups: (): readonly LayerGroup[] => domain.layerGroups,
  };
}
