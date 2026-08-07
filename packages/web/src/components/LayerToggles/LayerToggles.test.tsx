import type { Layer, LayerGroup } from "@karta/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as registry from "../../layers/registry";
import { LayerToggles } from "./LayerToggles";

describe("LayerToggles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks an unavailable layer as unavailable and disabled, with a badge", () => {
    const unavailableLayer: Layer = {
      id: "myciti",
      label: "MyCiTi",
      dataSource: ["/data/myciti.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: false,
      style: { kind: "line", color: "#000", weight: 2 },
    };
    const group: LayerGroup = {
      id: "transit",
      title: "Transit",
      layerIds: ["myciti"],
    };
    vi.spyOn(registry, "getLayer").mockReturnValue(unavailableLayer);
    vi.spyOn(registry, "getLayerGroups").mockReturnValue([group]);

    render(<LayerToggles visibleLayerIds={[]} onToggle={vi.fn()} />);

    expect(screen.getByTestId("layer-toggle-myciti-row")).toHaveAttribute(
      "data-unavailable",
      "true",
    );
    expect(screen.getByTestId("layer-toggle-myciti")).toBeDisabled();
    expect(screen.getByText("Not yet available")).toBeInTheDocument();
  });

  it("reflects visibility state on each layer's checkbox", () => {
    render(<LayerToggles visibleLayerIds={["townships"]} onToggle={vi.fn()} />);

    expect(screen.getByTestId("layer-toggle-townships")).toBeChecked();
    expect(screen.getByTestId("layer-toggle-rapid-rail")).not.toBeChecked();
  });

  it("calls onToggle with the layer id when its checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<LayerToggles visibleLayerIds={[]} onToggle={onToggle} />);

    screen.getByTestId("layer-toggle-rapid-rail").click();

    expect(onToggle).toHaveBeenCalledWith("rapid-rail");
  });

  it("shows a layer's description when it has one", () => {
    const layerWithDescription: Layer = {
      id: "townships",
      label: "Modelled car time",
      description:
        "Modelled car drive-time from each recognised township area to its nearest selected job centre.",
      dataSource: ["/data/townships.geojson"],
      geometryKind: "choropleth",
      defaultVisible: true,
      available: true,
      style: {
        kind: "choropleth",
        propertyKey: "commuteMinutes",
        buckets: [],
        baseOpacity: 0.2,
      },
    };
    const group: LayerGroup = {
      id: "access-to-opportunity",
      title: "Accessibility overlays",
      selectionMode: "exclusive",
      layerIds: ["townships"],
    };
    vi.spyOn(registry, "getLayer").mockReturnValue(layerWithDescription);
    vi.spyOn(registry, "getLayerGroups").mockReturnValue([group]);

    render(<LayerToggles visibleLayerIds={[]} onToggle={vi.fn()} />);

    expect(
      screen.getByTestId("layer-toggle-townships-description"),
    ).toHaveTextContent(
      "Modelled car drive-time from each recognised township area to its nearest selected job centre.",
    );
  });

  it("shows no description for a layer that doesn't have one", () => {
    const layerWithoutDescription: Layer = {
      id: "myciti",
      label: "MyCiTi",
      dataSource: ["/data/myciti.geojson"],
      geometryKind: "line",
      defaultVisible: false,
      available: true,
      style: { kind: "line", color: "#000", weight: 2 },
    };
    const group: LayerGroup = {
      id: "transit",
      title: "Transit",
      selectionMode: "independent",
      layerIds: ["myciti"],
    };
    vi.spyOn(registry, "getLayer").mockReturnValue(layerWithoutDescription);
    vi.spyOn(registry, "getLayerGroups").mockReturnValue([group]);

    render(<LayerToggles visibleLayerIds={[]} onToggle={vi.fn()} />);

    expect(
      screen.queryByTestId("layer-toggle-myciti-description"),
    ).not.toBeInTheDocument();
  });

  it("shows no failure badge by default", () => {
    render(<LayerToggles visibleLayerIds={[]} onToggle={vi.fn()} />);

    expect(
      screen.queryByTestId("layer-toggle-rapid-rail-error"),
    ).not.toBeInTheDocument();
  });

  it("shows a failure badge for a layer whose data failed to load", () => {
    render(
      <LayerToggles
        visibleLayerIds={["rapid-rail"]}
        onToggle={vi.fn()}
        failedLayerIds={["rapid-rail"]}
      />,
    );

    expect(
      screen.getByTestId("layer-toggle-rapid-rail-error"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("layer-toggle-bus-error"),
    ).not.toBeInTheDocument();
  });
});
