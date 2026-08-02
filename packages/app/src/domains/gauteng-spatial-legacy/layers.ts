import type { Layer } from "@stratum/core";
import { getTownshipGroup } from "../../constants/townships";

function dataUrl(fileName: string): string {
  return `/data/gauteng/${fileName}`;
}

function resolveTownshipEmphasis(
  properties: Record<string, unknown> | null | undefined,
): boolean {
  const name = properties?.name;
  const id = properties?.id;
  if (typeof name !== "string") {
    return false;
  }
  return (
    getTownshipGroup(name, typeof id === "string" ? id : undefined) !==
    undefined
  );
}

export const GAUTENG_SPATIAL_LEGACY_LAYERS: Layer[] = [
  {
    id: "townships",
    label: "Modelled car time",
    description:
      "Modelled car drive-time from each recognised township area to its nearest selected job centre.",
    dataSource: [dataUrl("townships.display.v1.geojson")],
    companionSource: dataUrl("township-areas.display.v1.geojson"),
    geometryKind: "choropleth",
    defaultVisible: true,
    available: true,
    interaction: { selectable: true, labelField: "name" },
    style: {
      kind: "choropleth",
      propertyKey: "commuteMinutes",
      buckets: [
        { max: 20, color: "#7A9B6E", label: "Short (≤ 20 min)" },
        { max: 40, color: "#C9A227", label: "Moderate (21–40 min)" },
        { max: 60, color: "#D6703F", label: "Long (41–60 min)" },
        {
          max: Number.POSITIVE_INFINITY,
          color: "#C1502E",
          label: "Very long (> 60 min)",
        },
      ],
      baseOpacity: 0.18,
      emphasisOpacity: 0.78,
      resolveEmphasis: resolveTownshipEmphasis,
    },
  },
  {
    id: "nearest-transit",
    label: "Distance to Nearest Transit",
    description:
      "Straight-line distance from each recognised township area to the nearest formal transit route.",
    dataSource: [dataUrl("townships.display.v1.geojson")],
    companionSource: dataUrl("township-areas.display.v1.geojson"),
    geometryKind: "choropleth",
    defaultVisible: false,
    available: true,
    interaction: { selectable: true, labelField: "name" },
    style: {
      kind: "choropleth",
      propertyKey: "nearestTransitKm",
      buckets: [
        { max: 1, color: "#CFE3F5", label: "Near (≤ 1 km)" },
        { max: 3, color: "#7FB2E5", label: "Moderate (1–3 km)" },
        { max: 8, color: "#3673B8", label: "Far (3–8 km)" },
        {
          max: Number.POSITIVE_INFINITY,
          color: "#123F6E",
          label: "Very far (> 8 km)",
        },
      ],
      baseOpacity: 0.18,
      emphasisOpacity: 0.78,
      resolveEmphasis: resolveTownshipEmphasis,
    },
  },
  {
    id: "rapid-rail",
    label: "Rapid Rail",
    dataSource: [dataUrl("rapid-rail.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    hasPointGeometry: true,
    style: {
      kind: "line",
      color: "#E69F00",
      weight: 3,
      legendLabel: "Rapid Rail",
    },
  },
  {
    id: "bus-rapid-transit",
    label: "Bus Rapid Transit",
    dataSource: [dataUrl("bus-rapid-transit.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: {
      kind: "line",
      color: "#009E73",
      weight: 3,
      legendLabel: "Bus Rapid Transit",
      colorClassification: {
        kind: "categorized",
        propertyKey: "network",
        stops: [
          { match: "A Re Yeng", value: "#56B4E9", label: "A Re Yeng" },
          { match: "Rea Vaya", value: "#009E73", label: "Rea Vaya" },
          {
            match: "Ekurhuleni IRPTN",
            value: "#0072B2",
            label: "Ekurhuleni IRPTN",
          },
        ],
        fallback: "#009E73",
      },
    },
  },
  {
    id: "commuter-rail",
    label: "Commuter Rail",
    dataSource: [dataUrl("commuter-rail.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    hasPointGeometry: true,
    style: {
      kind: "line",
      color: "#D55E00",
      weight: 2,
      legendLabel: "Commuter Rail",
    },
  },
  {
    id: "bus",
    label: "Bus",
    dataSource: [dataUrl("bus.display.v1.geojson")],
    geometryKind: "line",
    defaultVisible: false,
    available: true,
    style: { kind: "line", color: "#CC79A7", weight: 3, legendLabel: "Bus" },
  },
];
