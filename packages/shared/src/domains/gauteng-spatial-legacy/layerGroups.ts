import type { LayerGroup } from "../../types/genericLayer";

export const GAUTENG_SPATIAL_LEGACY_LAYER_GROUPS: LayerGroup[] = [
  {
    id: "access-to-opportunity",
    title: "Accessibility overlays",
    description: "Only one overlay can be active at a time.",
    selectionMode: "exclusive",
    layerIds: ["townships", "nearest-transit"],
  },
  {
    id: "transit-networks",
    title: "Transit networks",
    selectionMode: "independent",
    layerIds: ["rapid-rail", "bus-rapid-transit", "commuter-rail", "bus"],
  },
];
