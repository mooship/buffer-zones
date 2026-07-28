import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  GeoJSON: ({ data }: { data: { features: unknown[] } }) => (
    <div data-testid="geojson-layer">{data.features.length} features</div>
  ),
  Pane: () => null,
  ZoomControl: () => null,
}));

vi.mock("./data/fetchFeatureCollection", () => ({
  fetchFeatureCollection: async () => ({
    type: "FeatureCollection",
    features: [],
  }),
}));

vi.mock("./data/TownshipDataRepository", () => ({
  createTownshipDataRepository: () => ({
    getTownships: async () => [
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
    ],
  }),
}));

import { App } from "./App";

describe("App", () => {
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

  it("shows the legend and layer controls", async () => {
    render(<App />);

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

    expect(screen.getByRole("tab", { name: "Map layers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));

    expect(screen.getByText(/apartheid law controlled/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: /modeled car time/i }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });

  it("collapses and restores the controls panel", async () => {
    render(<App />);

    const trigger = screen.getByRole("button", { name: /close/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);

    expect(
      screen.queryByRole("list", { name: /modeled car time/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /layers/i }));

    expect(
      screen.getByRole("list", { name: /modeled car time/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });
});
