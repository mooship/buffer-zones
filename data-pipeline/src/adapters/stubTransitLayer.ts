import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";

// Placeholder for operators with no real adapter yet: MyCiTi/Durban Transport
// (Cape Town/Durban aren't in METROS yet).
export function createStubTransitLayer(): TransitLayerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
