import type { LayerDefinition, LayerId } from "@buffer-zones/shared";
import { TRANSIT_LINE_COLORS } from "../constants/layerStyles";
import { buildRegionDataUrls } from "../data/regionDataUrls";

const LAYER_DEFINITIONS: readonly LayerDefinition[] = [
  {
    id: "townships",
    label: "Modeled car time",
    dataSource: buildRegionDataUrls("townships.display.v1.geojson"),
    layerType: "choropleth",
    defaultVisible: true,
    available: true,
    style: { kind: "choropleth", propertyKey: "commuteMinutes" },
  },
  {
    id: "nearest-transit",
    label: "Distance to Nearest Transit",
    dataSource: buildRegionDataUrls("townships.display.v1.geojson"),
    layerType: "choropleth",
    defaultVisible: false,
    available: true,
    style: { kind: "choropleth", propertyKey: "nearestTransitKm" },
  },
  {
    id: "rapid-rail",
    label: "Rapid Rail",
    dataSource: buildRegionDataUrls("rapid-rail.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.rapidRail, weight: 3 },
  },
  {
    id: "bus-rapid-transit",
    label: "Bus Rapid Transit",
    dataSource: buildRegionDataUrls("bus-rapid-transit.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.busRapidTransit,
      weight: 3,
    },
  },
  {
    id: "commuter-rail",
    label: "Commuter Rail",
    dataSource: buildRegionDataUrls("commuter-rail.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.commuterRail,
      weight: 2,
    },
  },
  {
    id: "bus",
    label: "Bus",
    dataSource: buildRegionDataUrls("bus.display.v1.geojson"),
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.bus,
      weight: 3,
    },
  },
];

export function getLayerDefinitions(): readonly LayerDefinition[] {
  return LAYER_DEFINITIONS;
}

export function getLayerDefinition(id: LayerId): LayerDefinition | undefined {
  return LAYER_DEFINITIONS.find((layer) => layer.id === id);
}
