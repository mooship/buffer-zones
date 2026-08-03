/**
 * Basenames of the per-metro `<name>.display.v1.geojson` transit files that
 * `data-pipeline/src/buildDisplayData.ts` (the legacy per-metro display
 * rebuild helper, see `npm run display` in `data-pipeline/README.md`) knows
 * how to look up and rebuild.
 */
export const TRANSIT_OPERATOR_LAYER_NAMES = [
  "gautrain",
  "gautrain-bus",
  "prasa",
  "a-re-yeng",
  "rea-vaya",
] as const;

/** One of `TRANSIT_OPERATOR_LAYER_NAMES`. */
export type TransitOperatorLayerName =
  (typeof TRANSIT_OPERATOR_LAYER_NAMES)[number];
