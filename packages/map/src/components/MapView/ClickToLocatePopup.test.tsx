import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const geocodeMocks = vi.hoisted(() => ({
  fetchReverseGeocodeResult: vi.fn(),
}));

vi.mock("../../data/locationSearch", () => ({
  fetchReverseGeocodeResult: geocodeMocks.fetchReverseGeocodeResult,
}));

const mapEventsMocks = vi.hoisted(() => ({
  handlers: {} as {
    click?: (event: { latlng: { lat: number; lng: number } }) => void;
  },
}));

vi.mock("react-leaflet", () => ({
  useMapEvents: (handlers: typeof mapEventsMocks.handlers) => {
    mapEventsMocks.handlers = handlers;
    return {};
  },
  Popup: ({ children }: { children: ReactNode }) => (
    <div data-testid="click-locate-popup">{children}</div>
  ),
}));

import { ClickToLocatePopup } from "./ClickToLocatePopup";

describe("ClickToLocatePopup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message then the resolved address after a map click", async () => {
    let resolveResult: (value: { label: string } | null) => void = () => {};
    geocodeMocks.fetchReverseGeocodeResult.mockReturnValue(
      new Promise((resolve) => {
        resolveResult = resolve;
      }),
    );

    render(<ClickToLocatePopup />);
    expect(screen.queryByTestId("click-locate-popup")).not.toBeInTheDocument();

    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: -26.2, lng: 28.0 } });
    });

    expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
      /looking up/i,
    );

    await act(async () => {
      resolveResult({ label: "Braamfontein, Johannesburg" } as never);
    });

    await waitFor(() => {
      expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
        "Braamfontein, Johannesburg",
      );
    });
    expect(geocodeMocks.fetchReverseGeocodeResult).toHaveBeenCalledWith(
      -26.2,
      28.0,
      expect.any(AbortSignal),
    );
  });

  it("shows a fallback message when no address is found", async () => {
    geocodeMocks.fetchReverseGeocodeResult.mockResolvedValue(null);

    render(<ClickToLocatePopup />);
    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: 0, lng: 0 } });
    });

    await waitFor(() => {
      expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
        /no address found/i,
      );
    });
  });

  it("shows a fallback message when the lookup fails", async () => {
    geocodeMocks.fetchReverseGeocodeResult.mockRejectedValue(
      new Error("network"),
    );

    render(<ClickToLocatePopup />);
    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: -26.2, lng: 28.0 } });
    });

    await waitFor(() => {
      expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
        /no address found/i,
      );
    });
  });

  it("aborts the previous lookup when clicking again before it resolves", async () => {
    let firstAborted = false;
    geocodeMocks.fetchReverseGeocodeResult
      .mockImplementationOnce(
        (_lat: number, _lng: number, signal?: AbortSignal) =>
          new Promise(() => {
            signal?.addEventListener("abort", () => {
              firstAborted = true;
            });
          }),
      )
      .mockResolvedValueOnce({ label: "Second place" });

    render(<ClickToLocatePopup />);
    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: -26.2, lng: 28.0 } });
    });
    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: -26.3, lng: 28.1 } });
    });

    await waitFor(() => {
      expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
        "Second place",
      );
    });
    expect(firstAborted).toBe(true);
  });

  it("ignores a stale lookup that resolves after being superseded by a newer click", async () => {
    let resolveFirst: (value: { label: string } | null) => void = () => {};
    geocodeMocks.fetchReverseGeocodeResult
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ label: "Second place" });

    render(<ClickToLocatePopup />);
    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: -26.2, lng: 28.0 } });
    });
    act(() => {
      mapEventsMocks.handlers.click?.({ latlng: { lat: -26.3, lng: 28.1 } });
    });

    await waitFor(() => {
      expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
        "Second place",
      );
    });

    await act(async () => {
      resolveFirst({ label: "Stale first place" });
    });

    expect(screen.getByTestId("click-locate-popup")).toHaveTextContent(
      "Second place",
    );
  });
});
