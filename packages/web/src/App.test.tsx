import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dataMocks = vi.hoisted(() => ({
  getTownships: vi.fn(),
  fetchAreas: vi.fn(),
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  GeoJSON: forwardRef<never, { data: { features: unknown[] } }>(
    ({ data }, _ref) => (
      <div data-testid="geojson-layer">{data.features.length} features</div>
    ),
  ),
  Pane: () => null,
  ZoomControl: () => null,
  ScaleControl: () => null,
  useMap: () => ({
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
    getContainer: () => document.createElement("div"),
    getZoom: () => 9,
    on: vi.fn(),
    off: vi.fn(),
  }),
  useMapEvents: () => ({}),
  Popup: () => null,
}));

vi.mock("@stratum/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stratum/core")>();
  return {
    ...actual,
    fetchFeatureCollection: dataMocks.fetchAreas,
  };
});

vi.mock("./data/TownshipDataRepository", () => ({
  createTownshipDataRepository: () => ({
    getTownships: dataMocks.getTownships,
  }),
}));

import { App } from "./App";
import { useMapUiStore } from "./stores/useMapUiStore";

describe("App", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });
    useMapUiStore.getState().reset();
    dataMocks.getTownships.mockReset().mockResolvedValue([
      {
        type: "Feature",
        properties: {
          id: "A",
          name: "Mamelodi",
          commuteMinutes: 20,
          nearestJobCenter: "Pretoria CBD",
          distanceKm: null,
          nearestTransitKm: null,
          nearestAReYengStopKm: null,
        },
        geometry: null,
      },
    ]);
    dataMocks.fetchAreas.mockReset().mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });
  });
  it("provides skip navigation and a main landmark", async () => {
    render(<App />);

    expect(
      screen.getByRole("link", { name: /skip to map information/i }),
    ).toHaveAttribute("href", "#map-information");
    expect(screen.getByRole("main")).toHaveAttribute("id", "map-information");
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("does not render the top-left introduction card", async () => {
    render(<App />);

    expect(
      screen.queryByRole("button", { name: /minimise introduction/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /buffer zones/i, level: 1 }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toHaveTextContent(
        "1 features",
      ),
    );
  });

  it("shows map-chrome location search outside settings", async () => {
    render(<App />);

    expect(screen.getByTestId("location-search-input")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    expect(
      screen.queryByTestId("settings-location-search-input"),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("shows layer controls immediately in the layers tab", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Map layers" }));

    expect(
      await screen.findByRole("checkbox", { name: "Modelled car time" }),
    ).toBeChecked();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("separates the evidence narrative from map controls", async () => {
    render(<App />);

    expect(screen.getByRole("tab", { name: "The pattern" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    expect(screen.getByText(/apartheid law controlled/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Modelled car time" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("supports arrow-key navigation between panel tabs", async () => {
    render(<App />);

    const storyTab = screen.getByRole("tab", { name: "The pattern" });
    fireEvent.keyDown(storyTab, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Browse places" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "panel-tab-places",
    );
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("offers a non-map way to browse township evidence", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Browse places" }));

    expect(
      await screen.findByRole("button", { name: /browse mamelodi/i }),
    ).toBeInTheDocument();
  });

  it("supports Home, End, and ArrowLeft tab navigation shortcuts", async () => {
    render(<App />);

    const storyTab = screen.getByRole("tab", { name: "The pattern" });
    fireEvent.keyDown(storyTab, { key: "End" });
    expect(screen.getByRole("tab", { name: "Map layers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Map layers" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("tab", { name: "Browse places" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Browse places" }), {
      key: "Home",
    });
    expect(screen.getByRole("tab", { name: "The pattern" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("ignores keys other than the supported arrow/Home/End tab shortcuts", async () => {
    render(<App />);

    const storyTab = screen.getByRole("tab", { name: "The pattern" });
    fireEvent.keyDown(storyTab, { key: "a" });

    expect(storyTab).toHaveAttribute("aria-selected", "true");
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("selecting a place in the browser updates the shared selection", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Browse places" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /browse mamelodi/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /mamelodi, modelled car time/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Mamelodi" }),
    ).toBeInTheDocument();
  });

  it("collapses and restores the controls panel", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Map layers" }));
    const trigger = screen.getByRole("button", { name: /close/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);

    expect(
      screen.queryByRole("checkbox", { name: "Modelled car time" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    expect(
      screen.getByRole("checkbox", { name: "Modelled car time" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("keeps the legend visible on desktop while layer controls are open", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Map layers" }));

    expect(
      await screen.findByRole("checkbox", { name: "Modelled car time" }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("desktop-legend")).toBeVisible();
    expect(
      screen.getByRole("list", { name: /active map layers legend/i }),
    ).toBeInTheDocument();
  });

  it("provides one-tap mobile legend access while the panel is closed", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );

    const exploreButton = screen.getByRole("button", { name: /explore/i });
    expect(exploreButton).toHaveAttribute("aria-expanded", "false");

    const openLegend = screen.getByRole("button", { name: /open map legend/i });
    expect(openLegend).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(openLegend);

    expect(openLegend).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("mobile-legend-content")).toBeVisible();
    expect(
      screen.getByRole("list", { name: /active map layers legend/i }),
    ).toBeInTheDocument();

    fireEvent.click(openLegend);
    expect(
      screen.queryByTestId("mobile-legend-content"),
    ).not.toBeInTheDocument();
  });

  it("lets mobile users snap the panel between medium and full height", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );

    const openPanel = screen.getByRole("button", { name: /explore/i });
    fireEvent.click(openPanel);

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    expect(panel).toHaveAttribute("data-panel-size", "medium");
    expect(handle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(handle);

    expect(panel).toHaveAttribute("data-panel-size", "full");
    expect(handle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(handle);

    expect(panel).toHaveAttribute("data-panel-size", "medium");
    expect(handle).toHaveAttribute("aria-pressed", "false");
  });

  it("supports drag gestures on the mobile sheet handle", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 7,
      clientY: 220,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 7,
      clientY: 150,
    });

    await waitFor(() =>
      expect(panel).toHaveAttribute("data-panel-dragging", "true"),
    );
    expect(handle).toHaveAttribute("data-dragging", "true");

    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 7,
      clientY: 130,
    });

    expect(panel).toHaveAttribute("data-panel-size", "full");
    await waitFor(() =>
      expect(panel).toHaveAttribute("data-panel-dragging", "false"),
    );
    await waitFor(() =>
      expect(panel).toHaveAttribute("data-panel-drag-direction", "none"),
    );

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 8,
      clientY: 140,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 8,
      clientY: 210,
    });

    await waitFor(() =>
      expect(panel).toHaveAttribute("data-panel-drag-direction", "down"),
    );

    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 8,
      clientY: 230,
    });

    expect(panel).toHaveAttribute("data-panel-size", "medium");
  });

  it("suppresses the synthetic click that follows a drag past the threshold", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 9,
      clientY: 200,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 9,
      clientY: 100,
    });
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 9,
      clientY: 100,
    });

    expect(panel).toHaveAttribute("data-panel-size", "full");

    fireEvent.click(handle);
    expect(panel).toHaveAttribute("data-panel-size", "full");

    fireEvent.click(handle);
    expect(panel).toHaveAttribute("data-panel-size", "medium");
  });

  it("ignores sheet handle interactions on desktop viewports", async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 100,
      button: 0,
    });
    fireEvent.click(handle);

    expect(panel).toHaveAttribute("data-panel-dragging", "false");
    expect(panel).toHaveAttribute("data-panel-size", "medium");
  });

  it("ignores a non-primary mouse button on the sheet handle", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    fireEvent.pointerDown(handle, {
      pointerType: "mouse",
      pointerId: 2,
      clientY: 150,
      button: 2,
    });

    expect(panel).toHaveAttribute("data-panel-dragging", "false");
  });

  it("ignores pointer move and up events from a different pointer while dragging", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 200,
      button: 0,
    });

    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 99,
      clientY: 60,
    });
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 99,
      clientY: 60,
    });

    expect(panel).toHaveAttribute("data-panel-dragging", "true");

    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 200,
    });

    expect(panel).toHaveAttribute("data-panel-dragging", "false");
  });

  it("prunes velocity samples older than the tracking window during a drag", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    let now = 0;
    const performanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(() => now);

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 4,
      clientY: 200,
      button: 0,
    });
    now = 50;
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 4,
      clientY: 190,
    });
    now = 300;
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 4,
      clientY: 100,
    });
    now = 310;
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 4,
      clientY: 95,
    });
    now = 460;
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 4,
      clientY: 90,
    });

    expect(panel).toHaveAttribute("data-panel-size", "full");

    performanceNow.mockRestore();
  });

  it("treats a small drag as a tap and skips releasing already-released pointer capture", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
      writable: true,
    });
    useMapUiStore.getState().reset();

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    const panel = screen.getByTestId("panel-container");
    const handle = screen.getByTestId("panel-sheet-handle") as HTMLElement & {
      releasePointerCapture: (pointerId: number) => void;
    };

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 5,
      clientY: 200,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 5,
      clientY: 205,
    });
    handle.releasePointerCapture(5);
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 5,
      clientY: 205,
    });

    expect(panel).toHaveAttribute("data-panel-size", "medium");
    expect(panel).toHaveAttribute("data-panel-dragging", "false");
  });

  it("marks the document as reduced-transparency when the OS preference is set", async () => {
    const originalMatchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      if (query === "(prefers-reduced-transparency: reduce)") {
        return {
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        } as unknown as MediaQueryList;
      }
      return originalMatchMedia(query);
    });

    render(<App />);

    await waitFor(() =>
      expect(document.documentElement.dataset.reducedTransparency).toBe("true"),
    );

    delete document.documentElement.dataset.reducedTransparency;
  });

  it("does not update state if the component unmounts before township/area data resolves", async () => {
    let resolveTownships: ((value: unknown[]) => void) | undefined;
    dataMocks.getTownships.mockReset().mockReturnValue(
      new Promise((resolve) => {
        resolveTownships = resolve;
      }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { unmount } = render(<App />);
    unmount();
    resolveTownships?.([]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not set a data error if the component unmounts before the fetch rejects", async () => {
    let rejectTownships: ((reason: unknown) => void) | undefined;
    dataMocks.getTownships.mockReset().mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectTownships = reject;
      }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { unmount } = render(<App />);
    unmount();
    rejectTownships?.(new Error("data load failed"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("shows a data error and retries the validated requests", async () => {
    dataMocks.getTownships.mockRejectedValueOnce(new Error("invalid data"));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Map data could not be loaded",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(dataMocks.getTownships).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
