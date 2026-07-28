import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: ({ url }: { url: string }) => (
    <div data-testid="tile-layer">{url}</div>
  ),
  GeoJSON: ({ data }: { data: { features: unknown[] } }) => (
    <div data-testid="geojson-layer">{data.features.length} features</div>
  ),
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
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
    expect(screen.getAllByTestId("geojson-layer")).toHaveLength(1);
  });

  it("renders no GeoJSON layers when visibleLayerIds is empty", () => {
    render(<MapView townships={[]} visibleLayerIds={[]} />);

    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
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

    expect(await screen.findByText("1 features")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/data/gautrain.v1.geojson");
  });

  it("switches tile source when the satellite basemap is selected", () => {
    render(<MapView townships={[]} visibleLayerIds={[]} basemap="satellite" />);

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/arcgisonline/i);
  });
});
