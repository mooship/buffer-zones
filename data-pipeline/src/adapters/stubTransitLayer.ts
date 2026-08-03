import type { TransitLayerFeatureCollection } from "@stratum/app";

/**
 * Placeholder for operators with no real adapter yet — MyCiTi/Durban
 * Transport (Cape Town/Durban aren't in `METROS` yet) — returning an empty
 * `FeatureCollection` rather than omitting the layer entirely.
 */
export function createStubTransitLayer(): TransitLayerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
