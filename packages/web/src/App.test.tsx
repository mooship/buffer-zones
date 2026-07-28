import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode, forwardRef } from "react";
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
  useMap: () => ({
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
    getContainer: () => document.createElement("div"),
    getZoom: () => 9,
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock("./data/fetchFeatureCollection", () => ({
  fetchFeatureCollection: dataMocks.fetchAreas,
}));

vi.mock("./data/TownshipDataRepository", () => ({
  createTownshipDataRepository: () => ({
    getTownships: dataMocks.getTownships,
  }),
}));

import { App } from "./App";
import { useMapUiStore } from "./stores/useMapUiStore";

describe("App", () => {
  beforeEach(() => {
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
          unemploymentRatePercent: null,
          nearestGautrainStationKm: null,
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

  it("renders the title block and data attribution", async () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /buffer zones/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/statistics south africa/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toHaveTextContent(
        "1 features",
      ),
    );
  });

  it("minimises and restores the title context", async () => {
    render(<App />);

    const minimise = screen.getByRole("button", {
      name: "Minimise introduction",
    });
    fireEvent.click(minimise);

    expect(screen.getByRole("heading", { name: "Buffer Zones" })).toBeVisible();
    expect(screen.getByText(/how tshwane's spatial legacy/i)).not.toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Expand introduction" }),
    );
    expect(screen.getByText(/how tshwane's spatial legacy/i)).toBeVisible();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("shows the legend and layer controls", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Map layers" }));

    expect(
      screen.getByRole("list", { name: /modeled car time/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("checkbox", { name: "Modeled car time" }),
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
      screen.queryByRole("list", { name: /modeled car time/i }),
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

  it("collapses and restores the controls panel", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Map layers" }));
    const trigger = screen.getByRole("button", { name: /close/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);

    expect(
      screen.queryByRole("list", { name: /modeled car time/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /explore/i }));

    expect(
      screen.getByRole("list", { name: /modeled car time/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
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
