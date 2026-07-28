import { render, screen } from "@testing-library/react";
import { type ReactNode, forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-leaflet", () => ({
  MapContainer: ({
    bounds,
    children,
  }: {
    bounds: unknown;
    children: ReactNode;
  }) => (
    <div data-testid="map-container" data-has-bounds={String(Boolean(bounds))}>
      {children}
    </div>
  ),
  TileLayer: ({ url }: { url: string }) => (
    <div data-testid="tile-layer">{url}</div>
  ),
  GeoJSON: forwardRef<
    never,
    { data: { features: unknown[] }; pathOptions?: { pane?: string } }
  >(({ data, pathOptions }, _ref) => (
    <div data-testid="geojson-layer" data-pane={pathOptions?.pane}>
      {data.features.length} features
    </div>
  )),
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
  Pane: () => null,
  ZoomControl: () => <div data-testid="zoom-control" />,
}));

import { MapView } from "./MapView";

const townships = [
  {
    type: "Feature",
    properties: { id: "A", name: "Mamelodi", commuteMinutes: 10 },
    geometry: null,
  },
] as never;

describe("MapView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a tile layer and one GeoJSON layer per visible registry entry", () => {
    render(<MapView townships={townships} visibleLayerIds={["townships"]} />);

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("map-container")).toHaveAttribute(
      "data-has-bounds",
      "true",
    );
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
    expect(screen.getAllByTestId("geojson-layer")).toHaveLength(1);
  });

  it("renders no GeoJSON layers when visibleLayerIds is empty", () => {
    render(<MapView townships={[]} visibleLayerIds={[]} />);

    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
  });

  it("waits for township data before mounting the choropleth", () => {
    const { rerender } = render(
      <MapView townships={[]} visibleLayerIds={["townships"]} />,
    );

    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();

    rerender(<MapView townships={townships} visibleLayerIds={["townships"]} />);

    expect(screen.getByTestId("geojson-layer")).toHaveTextContent("1 features");
  });

  it("does not render a layer that has no data available yet", () => {
    render(<MapView townships={townships} visibleLayerIds={["myciti"]} />);

    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
  });

  it("fetches and renders overlay data for a visible transit layer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: null }],
        }),
      }),
    );

    render(<MapView townships={[]} visibleLayerIds={["gautrain"]} />);

    expect(await screen.findByText("1 features")).toHaveAttribute(
      "data-pane",
      "transit",
    );
    expect(fetch).toHaveBeenCalledWith("/data/gautrain.v1.geojson");
  });

  it("keeps township polygons in the pane below transit overlays", () => {
    render(<MapView townships={townships} visibleLayerIds={["townships"]} />);

    expect(screen.getByTestId("geojson-layer")).toHaveAttribute(
      "data-pane",
      "townships",
    );
  });

  it("renders dissolved township borders in a separate outline pane", () => {
    const townshipAreas = [
      {
        type: "Feature",
        properties: { name: "Mamelodi" },
        geometry: null,
      },
    ] as never;

    render(
      <MapView
        townships={townships}
        townshipAreas={townshipAreas}
        visibleLayerIds={["townships"]}
      />,
    );

    expect(
      screen
        .getAllByTestId("geojson-layer")
        .some((layer) => layer.dataset.pane === "township-outlines"),
    ).toBe(true);
  });

  it("switches tile source when the satellite basemap is selected", () => {
    render(<MapView townships={[]} visibleLayerIds={[]} basemap="satellite" />);

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/arcgisonline/i);
  });
});
