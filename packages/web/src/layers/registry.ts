import type { LayerDefinition, LayerId } from "@buffer-zones/shared";
import { TRANSIT_LINE_COLORS } from "../constants/layerStyles";

export const LAYER_REGISTRY: LayerDefinition[] = [
  {
    id: "townships",
    label: "Modeled car time",
    dataSource: "/data/townships.display.v1.geojson",
    layerType: "choropleth",
    defaultVisible: true,
    available: true,
    style: { kind: "choropleth", propertyKey: "commuteMinutes" },
  },
  {
    id: "nearest-transit",
    label: "Distance to Nearest Transit",
    dataSource: "/data/townships.v1.geojson",
    layerType: "choropleth",
    defaultVisible: false,
    available: true,
    style: { kind: "choropleth", propertyKey: "nearestTransitKm" },
  },
  {
    id: "gautrain",
    label: "Gautrain",
    dataSource: "/data/gautrain.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.gautrain, weight: 3 },
  },
  {
    id: "gautrain-bus",
    label: "Gautrain Bus",
    dataSource: "/data/gautrain-bus.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: TRANSIT_LINE_COLORS.gautrainBus,
      weight: 3,
    },
  },
  {
    id: "prasa",
    label: "PRASA Rail",
    dataSource: "/data/prasa.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.prasa, weight: 2 },
  },
  {
    id: "a-re-yeng",
    label: "A Re Yeng",
    dataSource: "/data/a-re-yeng.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.aReYeng, weight: 3 },
  },
  {
    id: "myciti",
    label: "MyCiTi",
    dataSource: "/data/myciti.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: false,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.unavailable, weight: 2 },
  },
  {
    id: "rea-vaya",
    label: "Rea Vaya",
    dataSource: "/data/rea-vaya.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: false,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.unavailable, weight: 2 },
  },
  {
    id: "metrobus",
    label: "Metrobus",
    dataSource: "/data/metrobus.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: false,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.unavailable, weight: 2 },
  },
  {
    id: "durban-transport",
    label: "Durban Transport",
    dataSource: "/data/durban-transport.v1.geojson",
    layerType: "line",
    defaultVisible: false,
    available: false,
    style: { kind: "line", color: TRANSIT_LINE_COLORS.unavailable, weight: 2 },
  },
];

export function getLayerDefinition(id: LayerId): LayerDefinition | undefined {
  return LAYER_REGISTRY.find((layer) => layer.id === id);
}
