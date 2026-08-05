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

  it("shows typeahead results, applies a selected location, and doesn't re-search after selecting it", async () => {
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
    expect(input).toHaveAttribute("aria-haspopup", "listbox");
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
    expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(1);

    // The debounced search effect fires on any query change, including the
    // one handleResultSelect makes (setQuery(result.label)); wait past its
    // delay to prove that change doesn't re-trigger a search and reopen the
    // dropdown with the just-picked result.
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("option", { name: /soweto, johannesburg/i }),
    ).not.toBeInTheDocument();
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

  it("shows a searching status while a search is in flight, then clears it", async () => {
    let resolveSearch: (value: never[]) => void = () => {};
    searchMocks.fetchLocationSearchResults.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    fireEvent.change(screen.getByTestId("location-search-input"), {
      target: { value: "Soweto" },
    });

    await waitFor(() => {
      expect(screen.getByText("Searching places...")).toBeInTheDocument();
    });

    resolveSearch([]);

    await waitFor(() => {
      expect(screen.queryByText("Searching places...")).not.toBeInTheDocument();
    });
  });

  it("shows a no-results message when the search returns nothing, without a retry button", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    fireEvent.change(screen.getByTestId("location-search-input"), {
      target: { value: "Nowhere" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("No places matched that search."),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("location-search-retry"),
    ).not.toBeInTheDocument();
  });

  it("shows an error message when the search fails", async () => {
    searchMocks.fetchLocationSearchResults.mockRejectedValue(
      new Error("network"),
    );

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    fireEvent.change(screen.getByTestId("location-search-input"), {
      target: { value: "Soweto" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Search is unavailable right now. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("re-issues the last query when Retry is clicked after a failed search", async () => {
    searchMocks.fetchLocationSearchResults.mockRejectedValueOnce(
      new Error("network"),
    );
    searchMocks.fetchLocationSearchResults.mockResolvedValueOnce([
      { id: "1", label: "Soweto, Johannesburg", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    fireEvent.change(screen.getByTestId("location-search-input"), {
      target: { value: "Soweto" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Search is unavailable right now. Please try again."),
      ).toBeInTheDocument();
    });
    expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("location-search-retry"));

    await waitFor(() => {
      expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(2);
    });
    expect(searchMocks.fetchLocationSearchResults).toHaveBeenLastCalledWith(
      "Soweto",
      expect.any(AbortSignal),
    );
    await screen.findByText("Soweto, Johannesburg");
    expect(
      screen.queryByText("Search is unavailable right now. Please try again."),
    ).not.toBeInTheDocument();
  });

  it("does not show a retry button when there is no search error", () => {
    render(<LocationSearchControl onLocationSelect={vi.fn()} />);

    expect(
      screen.queryByTestId("location-search-retry"),
    ).not.toBeInTheDocument();
  });

  it("keeps showing Searching for the active request even if a superseded request settles", async () => {
    let resolveFirst: (value: never[]) => void = () => {};
    let resolveSecond: (
      value: Array<{
        id: string;
        label: string;
        latitude: number;
        longitude: number;
      }>,
    ) => void = () => {};
    searchMocks.fetchLocationSearchResults
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");

    fireEvent.change(input, { target: { value: "First query" } });
    await waitFor(() => {
      expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(input, { target: { value: "Second query" } });
    await waitFor(() => {
      expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(2);
    });

    // The first (superseded) request settles while the second is still pending.
    resolveFirst([]);
    await waitFor(() => {
      expect(screen.getByText("Searching places...")).toBeInTheDocument();
    });

    resolveSecond([
      { id: "2", label: "Second result", latitude: 0, longitude: 0 },
    ]);
    await waitFor(() => {
      expect(screen.queryByText("Searching places...")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Second result")).toBeInTheDocument();
  });

  it("ignores a superseded request's rejection instead of showing a stale error", async () => {
    let rejectFirst: (reason: unknown) => void = () => {};
    searchMocks.fetchLocationSearchResults
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce([
        { id: "2", label: "Second result", latitude: 0, longitude: 0 },
      ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");

    fireEvent.change(input, { target: { value: "First query" } });
    await waitFor(() => {
      expect(searchMocks.fetchLocationSearchResults).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(input, { target: { value: "Second query" } });
    await waitFor(() => {
      expect(screen.getByText("Second result")).toBeInTheDocument();
    });

    // The first (superseded/aborted) request rejects after the second already landed.
    rejectFirst(new DOMException("Aborted", "AbortError"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(
      screen.queryByText("Search is unavailable right now. Please try again."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Second result")).toBeInTheDocument();
  });

  it("ignores ArrowDown/ArrowUp when there are no results", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Nowhere" } });
    await waitFor(() => {
      expect(
        screen.getByText("No places matched that search."),
      ).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });

    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("moves the active result with ArrowUp/ArrowDown and clamps at both ends", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      { id: "1", label: "First", latitude: 0, longitude: 0 },
      { id: "2", label: "Second", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Query" } });
    await screen.findByRole("option", { name: "First" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "First" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Second" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Second" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: "First" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: "First" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does nothing on Enter when no result is active", async () => {
    const onLocationSelect = vi.fn();
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      { id: "1", label: "First", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={onLocationSelect} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Query" } });
    await screen.findByRole("option", { name: "First" });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onLocationSelect).not.toHaveBeenCalled();
  });

  it("ignores keys other than the supported arrow/Enter/Escape shortcuts", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      { id: "1", label: "First", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Query" } });
    await screen.findByRole("option", { name: "First" });

    fireEvent.keyDown(input, { key: "a" });

    expect(screen.getByRole("option", { name: "First" })).toBeInTheDocument();
  });

  it("clears results on Escape", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      { id: "1", label: "First", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Query" } });
    await screen.findByRole("option", { name: "First" });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByRole("option", { name: "First" }),
    ).not.toBeInTheDocument();
  });

  it("does not show a clear button when the query is empty", () => {
    render(<LocationSearchControl onLocationSelect={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /clear search/i }),
    ).not.toBeInTheDocument();
  });

  it("clears the query, results, and error via the clear button", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      { id: "1", label: "First", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Query" } });
    await screen.findByRole("option", { name: "First" });

    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));

    expect(input).toHaveValue("");
    expect(
      screen.queryByRole("option", { name: "First" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear search/i }),
    ).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("clears the query and dismisses results on Escape", async () => {
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      { id: "1", label: "First", latitude: 0, longitude: 0 },
    ]);

    render(<LocationSearchControl onLocationSelect={vi.fn()} />);
    const input = screen.getByTestId("location-search-input");
    fireEvent.change(input, { target: { value: "Query" } });
    await screen.findByRole("option", { name: "First" });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
  });
});
