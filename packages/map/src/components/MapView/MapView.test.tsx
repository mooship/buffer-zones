import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, type ReactNode, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mapMocks = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  tileErrorHandler: null as null | (() => void),
  featureLayers: [] as Array<{
    feature: { properties?: { id?: string } | null };
    bindPopup: ReturnType<typeof vi.fn>;
    getPopup: ReturnType<typeof vi.fn>;
    openPopup: ReturnType<typeof vi.fn>;
    getBounds: ReturnType<typeof vi.fn>;
    on: (eventName: string, handler: (...args: unknown[]) => void) => void;
    __handlers: Record<string, (...args: unknown[]) => void>;
  }>,
}));

const popupMocks = vi.hoisted(() => ({
  renderToStaticMarkup: vi.fn().mockReturnValue("<div>Popup</div>"),
}));

vi.mock("react-dom/server", () => ({
  renderToStaticMarkup: popupMocks.renderToStaticMarkup,
}));

function createMockLayer(feature: { properties?: { id?: string } | null }) {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const element = document.createElement("path");
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
    getElement: vi.fn(() => element),
    getBounds: vi.fn(() => ({ north: -25, south: -26, east: 28, west: 27 })),
    on: (eventName: string, handler: (...args: unknown[]) => void) => {
      handlers[eventName] = handler;
    },
    __handlers: handlers,
    __element: element,
  };
  return layer;
}

vi.mock("react-leaflet", () => ({
  MapContainer: ({
    bounds,
    preferCanvas,
    children,
  }: {
    bounds: unknown;
    preferCanvas?: boolean;
    children: ReactNode;
  }) => (
    <div
      data-testid="map-container"
      data-has-bounds={String(Boolean(bounds))}
      data-prefer-canvas={String(Boolean(preferCanvas))}
    >
      {children}
    </div>
  ),
  TileLayer: ({
    url,
    detectRetina,
    eventHandlers,
  }: {
    url: string;
    detectRetina?: boolean;
    eventHandlers?: { tileerror?: () => void };
  }) => {
    mapMocks.tileErrorHandler = eventHandlers?.tileerror ?? null;
    return (
      <div data-testid="tile-layer" data-retina={String(detectRetina)}>
        {url}
      </div>
    );
  },
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
          layer.__handlers.add?.();
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

import { setThemePreference } from "@stratum/react";
import { DomainProvider } from "../../context/DomainContext";
import { MapView } from "./MapView";

const bounds: [[number, number], [number, number]] = [
  [-27.15, 27.1],
  [-25.3, 28.75],
];

function withDomain(ui: ReactNode) {
  return (
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>{ui}</DomainProvider>
  );
}

function testRenderFeaturePopup(properties: Record<string, unknown>) {
  return <div>{String(properties.name)}</div>;
}

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
    mapMocks.tileErrorHandler = null;
    mapMocks.featureLayers = [];
    popupMocks.renderToStaticMarkup.mockClear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    setThemePreference("system");
  });

  it("passes bounds to MapContainer", () => {
    render(
      withDomain(
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />,
      ),
    );
    expect(screen.getByTestId("map-container")).toHaveAttribute(
      "data-has-bounds",
      "true",
    );
  });

  it("calls renderFeaturePopup with feature properties when a feature is clicked", () => {
    vi.useFakeTimers();
    const renderFeaturePopup = vi.fn().mockReturnValue(<div>Custom popup</div>);
    const onFeatureSelect = vi.fn();

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
          onFeatureSelect={onFeatureSelect}
          renderFeaturePopup={renderFeaturePopup}
        />,
      ),
    );

    const firstLayer = mapMocks.featureLayers[0];
    expect(firstLayer).toBeDefined();
    firstLayer?.__handlers.click?.({ originalEvent: { detail: 1 } });
    vi.advanceTimersByTime(220);

    expect(renderFeaturePopup).toHaveBeenCalledWith(
      expect.objectContaining({ id: "A", name: "Mamelodi" }),
    );
  });

  it("renders a tile layer and one GeoJSON layer per visible registry entry", () => {
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("map-container")).toHaveAttribute(
      "data-has-bounds",
      "true",
    );
    expect(screen.getByTestId("map-container")).toHaveAttribute(
      "data-prefer-canvas",
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

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveAttribute(
      "data-retina",
      "true",
    );
  });

  it("binds township popup markup lazily on first click", () => {
    vi.useFakeTimers();
    const onFeatureSelect = vi.fn();

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
          onFeatureSelect={onFeatureSelect}
          renderFeaturePopup={testRenderFeaturePopup}
        />,
      ),
    );

    expect(popupMocks.renderToStaticMarkup).not.toHaveBeenCalled();

    const firstLayer = mapMocks.featureLayers[0];
    expect(firstLayer).toBeDefined();
    firstLayer?.__handlers.click?.({ originalEvent: { detail: 1 } });
    vi.advanceTimersByTime(220);

    expect(popupMocks.renderToStaticMarkup).toHaveBeenCalledTimes(1);
    expect(onFeatureSelect).toHaveBeenCalledWith("A");

    firstLayer?.__handlers.click?.({ originalEvent: { detail: 1 } });
    vi.advanceTimersByTime(220);
    expect(popupMocks.renderToStaticMarkup).toHaveBeenCalledTimes(1);
    expect(onFeatureSelect).toHaveBeenCalledTimes(2);
  });

  it("opens township popup via keyboard when the feature is focused", () => {
    const onFeatureSelect = vi.fn();

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
          onFeatureSelect={onFeatureSelect}
          renderFeaturePopup={testRenderFeaturePopup}
        />,
      ),
    );

    const firstLayer = mapMocks.featureLayers[0];
    expect(firstLayer).toBeDefined();

    firstLayer?.__element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(firstLayer?.bindPopup).toHaveBeenCalledTimes(1);
    expect(firstLayer?.openPopup).toHaveBeenCalledTimes(1);
    expect(onFeatureSelect).toHaveBeenCalledWith("A");
  });

  it("removes township-layer reference when a feature layer is removed", () => {
    const { rerender } = render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

    const firstLayer = mapMocks.featureLayers[0];
    expect(firstLayer).toBeDefined();

    firstLayer?.__handlers.remove?.();

    rerender(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
          selectedFeatureId="A"
        />,
      ),
    );

    expect(firstLayer?.openPopup).not.toHaveBeenCalled();
  });

  it("does not open popup or select township on double-click", () => {
    vi.useFakeTimers();
    const onFeatureSelect = vi.fn();

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
          onFeatureSelect={onFeatureSelect}
        />,
      ),
    );

    const firstLayer = mapMocks.featureLayers[0];
    expect(firstLayer).toBeDefined();

    firstLayer?.__handlers.click?.({ originalEvent: { detail: 1 } });
    firstLayer?.__handlers.dblclick?.();
    vi.advanceTimersByTime(220);

    expect(popupMocks.renderToStaticMarkup).not.toHaveBeenCalled();
    expect(onFeatureSelect).not.toHaveBeenCalled();
    expect(firstLayer?.openPopup).not.toHaveBeenCalled();
  });

  it("opens the selected township popup without scanning every layer", () => {
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
          selectedFeatureId="A"
          renderFeaturePopup={testRenderFeaturePopup}
        />,
      ),
    );

    expect(popupMocks.renderToStaticMarkup).toHaveBeenCalledTimes(1);
    expect(mapMocks.fitBounds).toHaveBeenCalledTimes(1);
    expect(mapMocks.featureLayers[0]?.openPopup).toHaveBeenCalledTimes(1);
  });

  it("renders no GeoJSON layers when visibleLayerIds is empty", () => {
    render(
      withDomain(
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />,
      ),
    );

    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();
  });

  it("waits for township data before mounting the choropleth", () => {
    const { rerender } = render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={[]}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

    expect(screen.queryByTestId("geojson-layer")).not.toBeInTheDocument();

    rerender(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

    expect(screen.getByTestId("geojson-layer")).toHaveTextContent("1 features");
  });

  it("does not render a layer that has no data available yet", () => {
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["myciti"]}
        />,
      ),
    );

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

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={[]}
          visibleLayerIds={["rapid-rail"]}
        />,
      ),
    );

    expect(await screen.findByText("1 features")).toHaveAttribute(
      "data-pane",
      "transit",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/data/gauteng/rapid-rail.display.v1.geojson",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("keeps township polygons in the pane below transit overlays", () => {
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

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
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          townshipAreas={townshipAreas}
          visibleLayerIds={["townships"]}
        />,
      ),
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
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          townshipAreas={townshipAreas}
          visibleLayerIds={["nearest-transit"]}
        />,
      ),
    );

    expect(
      screen
        .getAllByTestId("geojson-layer")
        .some((layer) => layer.dataset.pane === "township-outlines"),
    ).toBe(true);
  });

  it("fits to searched locations passed from the settings search", () => {
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={[]}
          visibleLayerIds={[]}
          focusLocationTarget={{
            token: 1,
            location: {
              id: "loc-1",
              label: "Soweto",
              latitude: -26.267,
              longitude: 27.854,
            },
          }}
        />,
      ),
    );

    expect(mapMocks.fitBounds).toHaveBeenCalled();
  });

  it("switches tile source when the satellite basemap is selected", () => {
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={[]}
          visibleLayerIds={[]}
          basemap="satellite"
        />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/arcgisonline/i);
  });

  it("uses the dark street tile source when the OS prefers dark mode", () => {
    stubMatchMedia(true);

    render(
      withDomain(
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/dark_all/i);
  });

  it("uses the light street tile source when the OS prefers light mode", () => {
    stubMatchMedia(false);

    render(
      withDomain(
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/light_all/i);
  });

  it("falls back to OpenStreetMap when the light street tiles error", () => {
    stubMatchMedia(false);

    render(
      withDomain(
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/light_all/i);
    act(() => {
      mapMocks.tileErrorHandler?.();
    });
    expect(screen.getByTestId("tile-layer")).toHaveTextContent(
      /tile\.openstreetmap\.org/i,
    );
  });

  it("falls back from dark street tiles before using OpenStreetMap", () => {
    stubMatchMedia(true);

    render(
      withDomain(
        <MapView bounds={bounds} townships={[]} visibleLayerIds={[]} />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/dark_all/i);
    act(() => {
      mapMocks.tileErrorHandler?.();
    });
    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/light_all/i);
    act(() => {
      mapMocks.tileErrorHandler?.();
    });
    expect(screen.getByTestId("tile-layer")).toHaveTextContent(
      /tile\.openstreetmap\.org/i,
    );
  });

  it("does not swap to a dark variant for satellite in dark mode", () => {
    stubMatchMedia(true);

    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={[]}
          visibleLayerIds={[]}
          basemap="satellite"
        />,
      ),
    );

    expect(screen.getByTestId("tile-layer")).toHaveTextContent(/arcgisonline/i);
  });

  it("refits the full area bounds when crossing the mobile breakpoint", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    vi.stubGlobal("innerWidth", 1024);
    render(
      withDomain(
        <MapView
          bounds={bounds}
          townships={townships}
          visibleLayerIds={["townships"]}
        />,
      ),
    );

    vi.stubGlobal("innerWidth", 390);
    fireEvent(window, new Event("resize"));

    expect(mapMocks.invalidateSize).toHaveBeenCalledWith({ animate: false });
    expect(mapMocks.fitBounds).toHaveBeenCalledWith(
      [
        [-27.15, 27.1],
        [-25.3, 28.75],
      ],
      { padding: [24, 24] },
    );
  });
});
