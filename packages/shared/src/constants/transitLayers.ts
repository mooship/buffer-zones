export const TRANSIT_OPERATOR_LAYER_NAMES = [
  "gautrain",
  "gautrain-bus",
  "prasa",
  "a-re-yeng",
  "rea-vaya",
] as const;

export type TransitOperatorLayerName =
  (typeof TRANSIT_OPERATOR_LAYER_NAMES)[number];
