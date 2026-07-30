import type { LayerId } from "@buffer-zones/shared";

// Colorblind-safe qualitative hues (Okabe-Ito palette), chosen to stay
// visually distinct from the blue "distance to nearest transit" choropleth
// scale below.
export const TRANSIT_LINE_COLORS = {
  rapidRail: "#E69F00",
  bus: "#CC79A7",
  busRapidTransit: "#009E73",
  commuterRail: "#D55E00",
  unavailable: "#8A93A5",
} as const;

// Real station/stop Point geometry is only available for these networks
// (railway=station nodes from Overpass); the others only have route
// LineString geometry, so their legend entries show a route line only.
export const STATION_LAYER_IDS: readonly LayerId[] = [
  "rapid-rail",
  "commuter-rail",
];

export const CHOROPLETH_STROKE = {
  weight: 0,
  fillOpacity: 0.18,
} as const;

export const TOWNSHIP_FILL = {
  fillOpacity: 0.78,
} as const;

export const TOWNSHIP_OUTLINE = {
  color: "#F2EDE6",
  weight: 4,
} as const;
