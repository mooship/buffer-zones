import { render, screen, waitFor } from "@testing-library/react";
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
}));

vi.mock("./data/TownshipDataRepository", () => ({
  createTownshipDataRepository: () => ({
    getTownships: async () => [
      {
        type: "Feature",
        properties: { id: "A", name: "Mamelodi", commuteMinutes: 20 },
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
      screen.getByRole("list", { name: /commute time/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("checkbox", { name: "Commute Time" }),
    ).toBeChecked();
    await waitFor(() =>
      expect(screen.getByTestId("geojson-layer")).toBeInTheDocument(),
    );
  });
});
