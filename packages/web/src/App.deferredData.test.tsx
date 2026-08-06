import { render, screen, waitFor } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dataMocks = vi.hoisted(() => ({
  getTownships: vi.fn(),
  fetchAreas: vi.fn(),
}));

const mapReadyMocks = vi.hoisted(() => ({
  pendingReadyCallbacks: [] as Array<() => void>,
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
      mapReadyMocks.pendingReadyCallbacks.push(callback);
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

describe("App choropleth data loading", () => {
  beforeEach(() => {
    useMapUiStore.getState().reset();
    mapReadyMocks.pendingReadyCallbacks = [];
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
        },
        geometry: null,
      },
    ]);
    dataMocks.fetchAreas.mockReset().mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    });
  });

  it("holds the township request back until the map reports it is ready", async () => {
    render(<App />);

    await waitFor(() => {
      expect(mapReadyMocks.pendingReadyCallbacks.length).toBeGreaterThan(0);
    });

    expect(dataMocks.getTownships).not.toHaveBeenCalled();
    expect(dataMocks.fetchAreas).not.toHaveBeenCalled();

    for (const callback of mapReadyMocks.pendingReadyCallbacks) {
      callback();
    }

    await waitFor(() => {
      expect(dataMocks.getTownships).toHaveBeenCalled();
    });
    expect(dataMocks.fetchAreas).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getAllByTestId("geojson-layer").length).toBeGreaterThan(0),
    );
  });
});
