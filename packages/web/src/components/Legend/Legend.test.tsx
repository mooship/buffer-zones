import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getLayer } from "../../layers/registry";
import { Legend } from "./Legend";

function choroplethBuckets(layerId: string) {
  const layer = getLayer(layerId);
  if (layer?.style.kind !== "choropleth") {
    throw new Error(`expected a choropleth layer for ${layerId}`);
  }
  return layer.style.buckets;
}

function ariaLabelFor(layerId: string) {
  const layer = getLayer(layerId);
  if (!layer) {
    throw new Error(`expected layer ${layerId}`);
  }
  return layer.description ?? layer.label;
}

describe("Legend", () => {
  it("renders each choropleth layer's bucket labels and colors from its style config", () => {
    render(<Legend />);

    const townshipsBuckets = choroplethBuckets("townships");
    const commuteList = screen.getByRole("list", {
      name: ariaLabelFor("townships"),
    });
    expect(commuteList).toBeInTheDocument();
    for (const bucket of townshipsBuckets) {
      const entry = screen.getByText(bucket.label);
      expect(entry.previousElementSibling).toHaveStyle({
        backgroundColor: bucket.color,
      });
    }

    const nearestTransitBuckets = choroplethBuckets("nearest-transit");
    expect(
      screen.getByRole("list", { name: ariaLabelFor("nearest-transit") }),
    ).toBeInTheDocument();
    for (const bucket of nearestTransitBuckets) {
      expect(screen.getByText(bucket.label)).toBeInTheDocument();
    }
  });

  it("shows a No data swatch for every choropleth layer, using the shared no-data color", () => {
    render(<Legend />);

    const noDataEntries = screen.getAllByText("No data");
    expect(noDataEntries).toHaveLength(2);
    for (const entry of noDataEntries) {
      expect(entry.previousElementSibling).toHaveStyle({
        backgroundColor: "#8A93A5",
      });
    }
  });

  it("renders one transit legend entry per line layer, with label and color from its style", () => {
    render(<Legend />);

    const rapidRailLayer = getLayer("rapid-rail");
    if (rapidRailLayer?.style.kind !== "line") {
      throw new Error("expected rapid-rail to be a line layer");
    }
    const rapidRail = screen.getByText(rapidRailLayer.style.legendLabel);
    expect(rapidRail.closest("li")).toHaveTextContent("line + stations");

    const busLayer = getLayer("bus");
    if (busLayer?.style.kind !== "line") {
      throw new Error("expected bus to be a line layer");
    }
    const bus = screen.getByText(busLayer.style.legendLabel);
    expect(bus.closest("li")).toHaveTextContent("route only");
  });

  it("marks only the networks with real station geometry as line + stations", () => {
    render(<Legend />);

    expect(screen.getByText("Commuter Rail").closest("li")).toHaveTextContent(
      "line + stations",
    );
    expect(
      screen.getByText("Bus Rapid Transit").closest("li"),
    ).toHaveTextContent("route only");
  });

  it("in active mode, only shows the legend section for a currently visible layer", () => {
    render(<Legend mode="active" visibleLayerIds={["townships"]} />);

    expect(
      screen.getByRole("list", {
        name: `Active map layers legend: ${ariaLabelFor("townships")}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Distance to Nearest Transit"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Rapid Rail")).not.toBeInTheDocument();
  });

  it("in active mode, shows only the visible transit layers", () => {
    render(<Legend mode="active" visibleLayerIds={["rapid-rail"]} />);

    expect(screen.getByText("Rapid Rail")).toBeInTheDocument();
    expect(screen.queryByText("Bus")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", {
        name: `Active map layers legend: ${ariaLabelFor("townships")}`,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty-state message when no layers are visible in active mode", () => {
    render(<Legend mode="active" visibleLayerIds={[]} />);

    expect(
      screen.getByText("Turn on layers to view their legend."),
    ).toBeInTheDocument();
  });
});
