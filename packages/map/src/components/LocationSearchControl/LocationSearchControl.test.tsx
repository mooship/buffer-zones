import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchMocks = vi.hoisted(() => ({
  fetchLocationSearchResults: vi.fn(),
}));

vi.mock("../../data/locationSearch", () => ({
  fetchLocationSearchResults: searchMocks.fetchLocationSearchResults,
  nominatimGeocoderProvider: {
    search: searchMocks.fetchLocationSearchResults,
    reverse: vi.fn(),
  },
}));

import { LocationSearchControl } from "./LocationSearchControl";

describe("LocationSearchControl", () => {
  beforeEach(() => {
    searchMocks.fetchLocationSearchResults.mockReset();
  });

  it("shows typeahead results and applies a selected location", async () => {
    const onLocationSelect = vi.fn();
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      {
        id: "123",
        label: "Soweto, Johannesburg, Gauteng, South Africa",
        latitude: -26.267,
        longitude: 27.854,
      },
    ]);

    render(<LocationSearchControl onLocationSelect={onLocationSelect} />);

    const input = screen.getByTestId("location-search-input");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-controls", "location-search-results");

    fireEvent.change(input, {
      target: { value: "Soweto" },
    });
    await waitFor(() => {
      expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledWith(
        "Soweto",
        expect.any(AbortSignal),
      );
    });

    const resultButton = await screen.findByRole("option", {
      name: /soweto, johannesburg/i,
    });
    fireEvent.click(resultButton);

    expect(onLocationSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123",
        latitude: -26.267,
        longitude: 27.854,
      }),
    );
  });

  it("supports keyboard selection from typeahead results", async () => {
    const onLocationSelect = vi.fn();
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      {
        id: "1",
        label: "Pretoria, City of Tshwane, Gauteng, South Africa",
        latitude: -25.746,
        longitude: 28.188,
      },
      {
        id: "2",
        label: "Pretoria North, City of Tshwane, Gauteng, South Africa",
        latitude: -25.67,
        longitude: 28.17,
      },
    ]);

    render(<LocationSearchControl onLocationSelect={onLocationSelect} />);

    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, {
      target: { value: "Pretoria" },
    });

    await waitFor(() => {
      expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledWith(
        "Pretoria",
        expect.any(AbortSignal),
      );
    });
    await screen.findByRole("option", { name: /pretoria, city of tshwane/i });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onLocationSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
      }),
    );
  });

  it("uses a custom provider instead of the default Nominatim one when given", async () => {
    const customSearch = vi.fn().mockResolvedValue([
      {
        id: "custom-1",
        label: "Custom result",
        latitude: -26.2,
        longitude: 28.0,
      },
    ]);

    render(
      <LocationSearchControl
        onLocationSelect={vi.fn()}
        provider={{ search: customSearch, reverse: vi.fn() }}
      />,
    );

    fireEvent.change(screen.getByTestId("location-search-input"), {
      target: { value: "Somewhere" },
    });

    await waitFor(() => {
      expect(customSearch).toHaveBeenCalledWith(
        "Somewhere",
        expect.any(AbortSignal),
      );
    });
    expect(searchMocks.fetchLocationSearchResults).not.toHaveBeenCalled();
  });
});
