import type { TransitLayerFeatureCollection } from "@buffer-zones/shared";

// Used for MyCiTi (Cape Town), Metrobus (Johannesburg's own conventional bus
// operator, distinct from the real Rea Vaya BRT adapter — a real Overpass
// adapter was tried on 2026-07-29 but found only a single verified stop with
// no route geometry at all, too sparse to ship as a real layer), and Durban
// Transport: registry entries exist and are typed, but real data hasn't been
// sourced yet. Populate a real adapter per operator later following the
// pattern in gautrain.ts/aReYeng.ts/reaVaya.ts, if OSM coverage improves or
// an authoritative source is found.
export function createStubTransitLayer(): TransitLayerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
