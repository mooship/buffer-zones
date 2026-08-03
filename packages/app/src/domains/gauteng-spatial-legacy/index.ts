import { buildGautengDatasetSummary } from "./datasetSummary";
import { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
import { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";

/**
 * Stratum's reference domain: apartheid-era spatial planning legacy across
 * Gauteng's metros. A `DomainConfig` (`layers`/`layerGroups`) plus an `id`,
 * `story`, and `datasetSummary` — extra fields beyond what `DomainConfig`
 * itself requires, used by `@stratum/web` for its "why this map exists" copy
 * and, together with `story`, as grounding context for its Ask AI feature.
 */
export const GAUTENG_SPATIAL_LEGACY_DOMAIN = {
  id: "gauteng-spatial-legacy",
  layers: GAUTENG_SPATIAL_LEGACY_LAYERS,
  layerGroups: GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS,
  story: {
    title: "Why this map exists",
    body: "Apartheid law controlled where Black, Coloured and Indian people could live. Black townships were deliberately separated from economic centres; those distances still shape access to work.",
  },
  datasetSummary: buildGautengDatasetSummary(),
};

export { buildGautengDatasetSummary } from "./datasetSummary";
export { GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS } from "./layerGroups";
export { GAUTENG_SPATIAL_LEGACY_LAYERS } from "./layers";
