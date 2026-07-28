import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";

// Used for MyCiTi, Rea Vaya, Metrobus, and Durban Transport in v1:
// registry entries exist and are typed, but real data hasn't been sourced yet
// (Tshwane/Pretoria-only scope, design doc §2/§8). Populate a real adapter per
// operator later following the pattern in gautrain.ts/aReYeng.ts.
export function createStubTransitLayer(): TransitLayerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
