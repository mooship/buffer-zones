import { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
import { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";

/**
 * Stratum's reference domain: apartheid-era spatial planning legacy across
 * Gauteng's metros. A `DomainConfig` (`layers`/`layerGroups`/`story`) plus
 * an `id` — the only field beyond what `DomainConfig` itself requires.
 */
export const GAUTENG_SPATIAL_LEGACY_DOMAIN = {
  id: "gauteng-spatial-legacy",
  layers: GAUTENG_SPATIAL_LEGACY_LAYERS,
  layerGroups: GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS,
  story: {
    title: "Why this map exists",
    body: "Apartheid law controlled where Black, Coloured and Indian people could live. Black townships were deliberately separated from economic centres; those distances still shape access to work.",
  },
};

export { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
export { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";
