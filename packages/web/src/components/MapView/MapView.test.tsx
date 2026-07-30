import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, forwardRef, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mapMocks = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  featureLayers: [] as Array<{
    feature: { properties?: { id?: string } | null };
    bindPopup: ReturnType<typeof vi.fn>;
    getPopup: ReturnType<typeof vi.fn>;
    openPopup: ReturnType<typeof vi.fn>;
    getBounds: ReturnType<typeof vi.fn>;
    on: (eventName: string, handler: () => void) => void;
    __handlers: Record<string, () => void>;
  }>,
}));

const popupMocks = vi.hoisted(() => ({
  renderToStaticMarkup: vi.fn().mockReturnValue("<div>Popup</div>"),
}));

vi.mock("react-dom/server", () => ({
  renderToStaticMarkup: popupMocks.renderToStaticMarkup,
}));

function createMockLayer(feature: { properties?: { id?: string } | null }) {
  const handlers: Record<string, () => void> = {};
  let popupContent: string | null = null;
  const layer = {
    feature,
    bindPopup: vi.fn((content: string) => {
      popupContent = content;
      return layer;
    }),
    getPopup: vi.fn(() => popupContent),
    openPopup: vi.fn(),
    bindTooltip: vi.fn(),
    getBounds: vi.fn(() => ({ north: -25, south: -26, east: 28, west: 27 })),
    on: (eventName: string, handler: () => void) => {
      handlers[eventName] = handler;
    },
    __handlers: handlers,
  };
  return layer;
}

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
    { eachLayer: (cb: (layer: unknown) => void) => void } | null,
    {
      data: { features: Array<{ properties?: { id?: string } | null }> };
      pathOptions?: { pane?: string };
      onEachFeature?: (
        feature: { properties?: { id?: string } | null },
        layer: ReturnType<typeof createMockLayer>,
      ) => void;
    }
  >(({ data, pathOptions, onEachFeature }, ref) => {
    useEffect(() => {
      const layers = data.features.map((feature) => createMockLayer(feature));
      mapMocks.featureLayers = layers;
      for (const [index, feature] of data.features.entries()) {
        const layer = layers[index];
        if (layer) {
          onEachFeature?.(feature, layer);
        }
      }
      if (ref && typeof ref === "object") {
        ref.current = {
          eachLayer: (cb: (layer: unknown) => void) => {
            for (const layer of layers) {
              cb(layer);
            }
          },
        };
      }
      return () => {
        if (ref && typeof ref === "object") {
          ref.current = null;
        }
      };
    }, [data.features, onEachFeature, ref]);

    return (
      <div data-testid="geojson-layer" data-pane={pathOptions?.pane}>
        {data.features.length} features
      </div>
    );
  }),
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
    mapMocks.featureLayers = [];
    popupMocks.renderToStaticMarkup.mockClear();
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
      "false",
    );
    expect(screen.getAllByTestId("geojson-layer")).toHaveLength(1);
  });

  it("enables retina tile loading on high-DPI desktop screens", () => {
    vi.stubGlobal("innerWidth", 1440);
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });

    render(<MapView townships={townships} visibleLayerIds={["townships"]} />);

    expect(screen.getByTestId("tile-layer")).toHaveAttribute(
      "data-retina",
      "true",
    );
  });

  it("binds township popup markup lazily on first click", () => {
    const onTownshipSelect = vi.fn();

    render(
      <MapView
        townships={townships}
        visibleLayerIds={["townships"]}
        onTownshipSelect={onTownshipSelect}
      />,
    );

    expect(popupMocks.renderToStaticMarkup).not.toHaveBeenCalled();

    const firstLayer = mapMocks.featureLayers[0];
    expect(firstLayer).toBeDefined();
    firstLayer?.__handlers.click?.();

    expect(popupMocks.renderToStaticMarkup).toHaveBeenCalledTimes(1);
    expect(onTownshipSelect).toHaveBeenCalledWith("A");

    firstLayer?.__handlers.click?.();
    expect(popupMocks.renderToStaticMarkup).toHaveBeenCalledTimes(1);
    expect(onTownshipSelect).toHaveBeenCalledTimes(2);
  });

  it("opens the selected township popup without scanning every layer", () => {
    render(
      <MapView
        townships={townships}
        visibleLayerIds={["townships"]}
        selectedTownshipId="A"
      />,
    );

    expect(popupMocks.renderToStaticMarkup).toHaveBeenCalledTimes(1);
    expect(mapMocks.fitBounds).toHaveBeenCalledTimes(1);
    expect(mapMocks.featureLayers[0]?.openPopup).toHaveBeenCalledTimes(1);
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

    render(<MapView townships={[]} visibleLayerIds={["rapid-rail"]} />);

    expect(await screen.findByText("1 features")).toHaveAttribute(
      "data-pane",
      "transit",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/data/national/rapid-rail.display.v1.geojson",
    );
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

  it("renders dissolved township borders when nearest-transit is active", () => {
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
        visibleLayerIds={["nearest-transit"]}
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
        [-35, 16],
        [-22, 33],
      ],
      { padding: [24, 24] },
    );
  });
});
