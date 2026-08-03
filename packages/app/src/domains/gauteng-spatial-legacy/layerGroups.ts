import type { LayerGroup } from "../../types/genericLayer";

/**
 * The `gauteng-spatial-legacy` domain's layer groups: the two accessibility
 * choropleth layers as a mutually-exclusive group (only one shown at a
 * time), and every transit network layer as an independently-toggleable
 * group.
 */
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
