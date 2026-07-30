import type { LayerDefinition, LayerId } from "@buffer-zones/shared";
import { TRANSIT_LINE_COLORS } from "../constants/layerStyles";

export function getLayerDefinitions(): LayerDefinition[] {
  const base = "/data/national";

  const layers: LayerDefinition[] = [
    {
      id: "townships",
      label: "Modeled car time",
      dataSource: `${base}/townships.display.v1.geojson`,
      layerType: "choropleth",
      defaultVisible: true,
      available: true,
      style: { kind: "choropleth", propertyKey: "commuteMinutes" },
    },
    {
      id: "nearest-transit",
      label: "Distance to Nearest Transit",
      dataSource: `${base}/townships.display.v1.geojson`,
      layerType: "choropleth",
      defaultVisible: false,
      available: true,
      style: { kind: "choropleth", propertyKey: "nearestTransitKm" },
    },
    {
      id: "rapid-rail",
      label: "Rapid Rail",
      dataSource: `${base}/rapid-rail.display.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: TRANSIT_LINE_COLORS.rapidRail, weight: 3 },
    },
    {
      id: "bus-rapid-transit",
      label: "Bus Rapid Transit",
      dataSource: `${base}/bus-rapid-transit.display.v1.geojson`,
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
      dataSource: `${base}/commuter-rail.display.v1.geojson`,
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
      dataSource: `${base}/bus.display.v1.geojson`,
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

  return layers;
}

export function getLayerDefinition(id: LayerId): LayerDefinition | undefined {
  return getLayerDefinitions().find((layer) => layer.id === id);
}
