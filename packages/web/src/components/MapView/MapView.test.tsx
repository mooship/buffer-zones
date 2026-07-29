import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mapMocks = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
}));

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
  TileLayer: ({
    url,
    detectRetina,
    className,
  }: { url: string; detectRetina?: boolean; className?: string }) => (
    <div
      data-testid="tile-layer"
      data-retina={String(detectRetina)}
      data-classname={className ?? ""}
    >
      {url}
    </div>
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
    fitBounds: mapMocks.fitBounds,
    invalidateSize: mapMocks.invalidateSize,
    getContainer: () => document.createElement("div"),
    getZoom: () => 9,
    on: vi.fn(),
    off: vi.fn(),
  }),
  Pane: () => null,
  ZoomControl: () => <div data-testid="zoom-control" />,
  ScaleControl: () => <div data-testid="scale-control" />,
}));

import { setThemePreference } from "../../hooks/useThemePreference";
import { MapView } from "./MapView";

const townships = [
  {
    type: "Feature",
    properties: { id: "A", name: "Mamelodi", commuteMinutes: 10 },
    geometry: null,
  },
] as never;

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("MapView", () => {
  afterEach(() => {
    mapMocks.fitBounds.mockReset();
    mapMocks.invalidateSize.mockReset();
    vi.unstubAllGlobals();
    setThemePreference("system");
  });

  it("renders a tile layer and one GeoJSON layer per visible registry entry", () => {
    render(<MapView townships={townships} visibleLayerIds={["townships"]} />);

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("map-container")).toHaveAttribute(
      "data-has-bounds",
      "true",
    );
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toHaveAttribute(
      "data-retina",
      "true",
    );
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

  it("applies the dark tile filter class to street tiles when the OS prefers dark mode", () => {
    stubMatchMedia(true);

    render(<MapView townships={[]} visibleLayerIds={[]} />);

    expect(screen.getByTestId("tile-layer").dataset.classname).not.toBe("");
  });

  it("does not apply the dark tile filter class when the OS prefers light mode", () => {
    stubMatchMedia(false);

    render(<MapView townships={[]} visibleLayerIds={[]} />);

    expect(screen.getByTestId("tile-layer").dataset.classname).toBe("");
  });

  it("does not apply the dark tile filter class to the satellite basemap in dark mode", () => {
    stubMatchMedia(true);

    render(<MapView townships={[]} visibleLayerIds={[]} basemap="satellite" />);

    expect(screen.getByTestId("tile-layer").dataset.classname).toBe("");
  });

  it("applies the dark tile filter class when the theme is explicitly dark, regardless of OS preference", () => {
    stubMatchMedia(false);
    setThemePreference("dark");

    render(<MapView townships={[]} visibleLayerIds={[]} />);

    expect(screen.getByTestId("tile-layer").dataset.classname).not.toBe("");
  });

  it("does not apply the dark tile filter class when the theme is explicitly light, regardless of OS preference", () => {
    stubMatchMedia(true);
    setThemePreference("light");

    render(<MapView townships={[]} visibleLayerIds={[]} />);

    expect(screen.getByTestId("tile-layer").dataset.classname).toBe("");
  });

  it("refits the full area bounds when crossing the mobile breakpoint", () => {
    vi.stubGlobal("innerWidth", 1024);
    render(<MapView townships={townships} visibleLayerIds={["townships"]} />);

    vi.stubGlobal("innerWidth", 390);
    fireEvent(window, new Event("resize"));

    expect(mapMocks.invalidateSize).toHaveBeenCalledWith({ animate: false });
    expect(mapMocks.fitBounds).toHaveBeenCalledWith(
      [
        [-25.95, 27.92],
        [-25.33, 28.79],
      ],
      { padding: [24, 24] },
    );
  });
});
