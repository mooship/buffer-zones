import { render, waitFor } from "@testing-library/react";
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
    whenReady: (callback: () => void) => {
      callback();
    },
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

interface RegisteredTool {
  name: string;
  execute: (
    input: unknown,
  ) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
}

function stubModelContext() {
  const registerTool = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: { registerTool },
  });
  return registerTool;
}

function clearModelContext() {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: undefined,
  });
}

describe("App WebMCP tool wiring", () => {
  beforeEach(() => {
    useMapUiStore.getState().reset();
    dataMocks.getTownships.mockReset().mockResolvedValue([]);
    dataMocks.fetchAreas.mockReset().mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    });
  });

  it("registers this app's WebMCP tools once the map data starts loading", async () => {
    const registerTool = stubModelContext();
    render(<App />);

    await waitFor(() => {
      const names = registerTool.mock.calls.map(
        ([tool]: [RegisteredTool]) => tool.name,
      );
      expect(names).toEqual(
        expect.arrayContaining([
          "list-map-layers",
          "toggle-map-layer",
          "search-map-location",
          "set-map-basemap",
          "set-app-theme",
          "read-map-story",
        ]),
      );
    });

    clearModelContext();
  });

  it("switches the panel to the story view and opens it when the read-map-story tool runs", async () => {
    const registerTool = stubModelContext();
    render(<App />);

    let storyTool: RegisteredTool | undefined;
    await waitFor(() => {
      storyTool = registerTool.mock.calls
        .map(([tool]: [RegisteredTool]) => tool)
        .find((tool: RegisteredTool) => tool.name === "read-map-story");
      expect(storyTool).toBeDefined();
    });

    await storyTool?.execute({});

    expect(useMapUiStore.getState().panelView).toBe("story");
    expect(useMapUiStore.getState().panelOpen).toBe(true);

    clearModelContext();
  });
});
