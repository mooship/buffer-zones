import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dataMocks = vi.hoisted(() => ({
  getTownships: vi.fn(),
  fetchAreas: vi.fn(),
}));

const mapViewMocks = vi.hoisted(() => ({
  latestProps: undefined as
    | undefined
    | {
        onBasemapError?: (basemap: string, error: unknown) => void;
        renderFeaturePopup?: (properties: unknown) => ReactNode;
        focusLocationTarget?: unknown;
        selectedFeatureId?: string | null;
      },
}));

vi.mock("@stratum/map/MapView", () => ({
  MapView: (props: NonNullable<typeof mapViewMocks.latestProps>) => {
    mapViewMocks.latestProps = props;
    return <div data-testid="mock-map-view" />;
  },
}));

vi.mock("@stratum/map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stratum/map")>();
  return {
    ...actual,
    LocationSearchControl: ({
      onLocationSelect,
    }: {
      onLocationSelect: (location: {
        id: string;
        label: string;
        latitude: number;
        longitude: number;
      }) => void;
    }) => (
      <button
        type="button"
        data-testid="fake-location-result"
        onClick={() =>
          onLocationSelect({
            id: "mamelodi",
            label: "Mamelodi, Tshwane",
            latitude: -25.7,
            longitude: 28.35,
          })
        }
      >
        Select Mamelodi
      </button>
    ),
  };
});

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

describe("App map/location callback wiring", () => {
  beforeEach(() => {
    useMapUiStore.getState().reset();
    mapViewMocks.latestProps = undefined;
    dataMocks.getTownships.mockReset().mockResolvedValue([]);
    dataMocks.fetchAreas.mockReset().mockResolvedValue({
      type: "FeatureCollection",
      features: [],
    });
  });

  it("falls back to the street basemap when the map reports a basemap load error", async () => {
    useMapUiStore.getState().setBasemap("voyager");
    render(<App />);

    await waitFor(() => expect(mapViewMocks.latestProps).toBeDefined());

    mapViewMocks.latestProps?.onBasemapError?.(
      "voyager",
      new Error("tiles unreachable"),
    );

    await waitFor(() =>
      expect(useMapUiStore.getState().basemap).toBe("street"),
    );
  });

  it("renders township popup content via renderFeaturePopup", async () => {
    render(<App />);

    await waitFor(() => expect(mapViewMocks.latestProps).toBeDefined());

    const popup = mapViewMocks.latestProps?.renderFeaturePopup?.({
      name: "Mamelodi",
      commuteMinutes: 20,
      nearestJobCenter: "Pretoria CBD",
      distanceKm: null,
      nearestTransitKm: null,
    });

    render(<div>{popup}</div>);

    expect(screen.getByTestId("township-popup")).toHaveTextContent("Mamelodi");
  });

  it("always provides renderFeaturePopup, regardless of which panel tab is open", async () => {
    useMapUiStore.getState().setPanelOpen(true);
    useMapUiStore.getState().setPanelView("ask");

    render(<App />);

    await waitFor(() => expect(mapViewMocks.latestProps).toBeDefined());

    expect(mapViewMocks.latestProps?.renderFeaturePopup).toBeInstanceOf(
      Function,
    );
  });

  it("clears the selected feature and focuses the map when a search result is chosen", async () => {
    render(<App />);

    await waitFor(() => expect(mapViewMocks.latestProps).toBeDefined());
    useMapUiStore.getState().setSelectedFeatureId("A");

    fireEvent.click(screen.getByTestId("fake-location-result"));

    await waitFor(() =>
      expect(useMapUiStore.getState().selectedFeatureId).toBeNull(),
    );
    await waitFor(() =>
      expect(mapViewMocks.latestProps?.focusLocationTarget).toMatchObject({
        location: { label: "Mamelodi, Tshwane" },
      }),
    );
  });
});
