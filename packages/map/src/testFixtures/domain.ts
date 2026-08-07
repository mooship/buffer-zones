import type { DomainConfig } from "@karta/core";

/**
 * A small, self-contained `DomainConfig` used only by `@karta/map`'s own
 * tests, so this package's test suite doesn't depend on a concrete downstream
 * domain (`@karta/app`) to verify its own generic rendering logic.
 */
export const TEST_DOMAIN: DomainConfig = {
  layers: [
    {
      id: "areas",
      label: "Coverage level",
      description: "Example choropleth layer covering a set of areas.",
      dataSource: ["/data/example/areas.display.v1.geojson"],
      companionSource: "/data/example/area-boundaries.display.v1.geojson",
      geometryKind: "choropleth",
      defaultVisible: true,
      available: true,
      interaction: { selectable: true, labelField: "name" },
      style: {
        kind: "choropleth",
        propertyKey: "value",
        buckets: [
          { max: 20, color: "#7A9B6E", label: "Low" },
          { max: 40, color: "#C9A227", label: "Moderate" },
          { max: 60, color: "#D6703F", label: "High" },
          {
            max: Number.POSITIVE_INFINITY,
            color: "#C1502E",
            label: "Very high",
          },
        ],
        baseOpacity: 0.18,
      },
    },
    {
      id: "coverage",
      label: "Alternate coverage",
      description: "A second choropleth layer for tests.",
      dataSource: ["/data/example/areas.display.v1.geojson"],
      companionSource: "/data/example/area-boundaries.display.v1.geojson",
      geometryKind: "choropleth",
      defaultVisible: false,
      available: true,
      interaction: { selectable: true, labelField: "name" },
      style: {
        kind: "choropleth",
        propertyKey: "value",
        buckets: [
          { max: 1, color: "#CFE3F5", label: "Near" },
          { max: 3, color: "#7FB2E5", label: "Moderate" },
          { max: 8, color: "#3673B8", label: "Far" },
          {
            max: Number.POSITIVE_INFINITY,
            color: "#123F6E",
            label: "Very far",
          },
        ],
        baseOpacity: 0.18,
      },
    },
    {
      id: "rail",
      label: "Rail",
      dataSource: ["/data/example/rail.display.v1.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      hasPointGeometry: true,
      style: { kind: "line", color: "#E69F00", weight: 3, legendLabel: "Rail" },
    },
    {
      id: "bus-network",
      label: "Bus Network",
      dataSource: ["/data/example/bus-network.display.v1.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: {
        kind: "line",
        color: "#009E73",
        weight: 3,
        legendLabel: "Bus Network",
        colorClassification: {
          kind: "categorized",
          propertyKey: "operator",
          stops: [
            { match: "North Line", value: "#56B4E9", label: "North Line" },
            { match: "South Line", value: "#009E73", label: "South Line" },
            { match: "East Line", value: "#0072B2", label: "East Line" },
          ],
          fallback: "#009E73",
        },
      },
    },
    {
      id: "shuttle",
      label: "Shuttle",
      dataSource: ["/data/example/shuttle.display.v1.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      hasPointGeometry: true,
      style: {
        kind: "line",
        color: "#D55E00",
        weight: 2,
        legendLabel: "Shuttle",
      },
    },
    {
      id: "bus",
      label: "Bus",
      dataSource: ["/data/example/bus.display.v1.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#CC79A7", weight: 3, legendLabel: "Bus" },
    },
  ],
  layerGroups: [
    {
      id: "group-a",
      title: "Group A",
      selectionMode: "independent",
      layerIds: ["areas", "rail"],
    },
  ],
};
