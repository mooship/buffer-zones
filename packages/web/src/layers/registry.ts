import type { LayerDefinition, LayerId, MetroId } from "@buffer-zones/shared";
import { TRANSIT_LINE_COLORS } from "../constants/layerStyles";

export function getLayerDefinitions(metroId: MetroId): LayerDefinition[] {
  const base = `/data/${metroId}`;
  const isTshwane = metroId === "tshwane";
  const isJohannesburg = metroId === "johannesburg";

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
      id: "gautrain",
      label: "Gautrain",
      dataSource: `${base}/gautrain.display.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: TRANSIT_LINE_COLORS.gautrain, weight: 3 },
    },
    {
      id: "gautrain-bus",
      label: "Gautrain Bus",
      dataSource: `${base}/gautrain-bus.display.v1.geojson`,
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
      dataSource: `${base}/prasa.display.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: TRANSIT_LINE_COLORS.prasa, weight: 2 },
    },
  ];

  // A Re Yeng and Rea Vaya are each a single city's own BRT operator, not a
  // Gauteng-wide network like Gautrain/Gautrain Bus/PRASA — they will never
  // exist in the other metro, so (unlike the genuinely-not-built-yet stubs
  // below) they're omitted entirely rather than shown disabled, to avoid
  // implying they're "coming soon" for a city they'll never serve.
  if (isTshwane) {
    layers.push({
      id: "a-re-yeng",
      label: "A Re Yeng",
      dataSource: `${base}/a-re-yeng.display.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: TRANSIT_LINE_COLORS.aReYeng, weight: 3 },
    });
  }

  if (isJohannesburg) {
    layers.push({
      id: "rea-vaya",
      label: "Rea Vaya",
      dataSource: `${base}/rea-vaya.display.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: TRANSIT_LINE_COLORS.reaVaya, weight: 3 },
    });
  }

  // MyCiTi/Metrobus/Durban Transport are operators in metros this app
  // doesn't cover at all yet (Cape Town, Johannesburg's conventional bus,
  // Durban) — shown disabled in every metro as a roadmap signal, distinct
  // from the Tshwane/Johannesburg-only operators above.
  layers.push(
    {
      id: "myciti",
      label: "MyCiTi",
      dataSource: `${base}/myciti.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: false,
      style: {
        kind: "line",
        color: TRANSIT_LINE_COLORS.unavailable,
        weight: 2,
      },
    },
    {
      id: "metrobus",
      label: "Metrobus",
      dataSource: `${base}/metrobus.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: false,
      style: {
        kind: "line",
        color: TRANSIT_LINE_COLORS.unavailable,
        weight: 2,
      },
    },
    {
      id: "durban-transport",
      label: "Durban Transport",
      dataSource: `${base}/durban-transport.v1.geojson`,
      layerType: "line",
      defaultVisible: false,
      available: false,
      style: {
        kind: "line",
        color: TRANSIT_LINE_COLORS.unavailable,
        weight: 2,
      },
    },
  );

  return layers;
}

export function getLayerDefinition(
  id: LayerId,
  metroId: MetroId,
): LayerDefinition | undefined {
  return getLayerDefinitions(metroId).find((layer) => layer.id === id);
}
