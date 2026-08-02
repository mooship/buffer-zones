import type { TownshipFeature } from "@stratum/app";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TownshipBrowser } from "./TownshipBrowser";

const townships = [
  {
    type: "Feature",
    geometry: null,
    properties: {
      id: "mamelodi",
      name: "Mamelodi",
      population: 334_577,
      commuteMinutes: 24,
      nearestJobCenter: "Hatfield",
      distanceKm: 18.2,
      nearestTransitKm: null,
    },
  },
  {
    type: "Feature",
    geometry: null,
    properties: {
      id: "soshanguve",
      name: "Soshanguve",
      commuteMinutes: 42,
      nearestJobCenter: "Rosslyn",
      distanceKm: 21.4,
      nearestTransitKm: null,
      nearestAReYengStopKm: null,
    },
  },
] as unknown as TownshipFeature[];

describe("TownshipBrowser", () => {
  it("filters places without removing the accessible result count", () => {
    render(
      <TownshipBrowser
        townships={townships}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("township-search"), {
      target: { value: "mame" },
    });

    expect(screen.getByTestId("township-group-mamelodi")).toBeInTheDocument();
    expect(
      screen.queryByTestId("township-group-soshanguve"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("township-result-count")).toBeInTheDocument();
  });

  it("selects a place and exposes the shared detail summary", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <TownshipBrowser
        townships={townships}
        selectedTownshipId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId("township-group-mamelodi"));
    fireEvent.click(screen.getByTestId("township-place-mamelodi"));
    expect(onSelect).toHaveBeenCalledWith(townships[0]);

    rerender(
      <TownshipBrowser
        townships={townships}
        selectedTownshipId="mamelodi"
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Mamelodi" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/334.577/)).toBeInTheDocument();

    const group = screen.getByTestId("township-group-mamelodi");
    expect(group).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(group);
    expect(group).toHaveAttribute("aria-expanded", "false");
  });

  it("sorts places by commute by default and lets users switch sorting", () => {
    const mamelodiTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-b",
          name: "Mamelodi Beta",
          commuteMinutes: 30,
          nearestJobCenter: "Hatfield",
          distanceKm: 18.2,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-a",
          name: "Mamelodi Alpha",
          commuteMinutes: 12,
          nearestJobCenter: "Hatfield",
          distanceKm: 18.2,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-c",
          name: "Mamelodi Charlie",
          commuteMinutes: null,
          nearestJobCenter: "Hatfield",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={mamelodiTownships}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("township-group-mamelodi"));

    expect(
      screen
        .getAllByTestId(/township-place-mamelodi-(a|b|c)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi Beta"),
      expect.stringContaining("Mamelodi Alpha"),
      expect.stringContaining("Mamelodi Charlie"),
    ]);

    fireEvent.change(screen.getByTestId("township-sort"), {
      target: { value: "name-asc" },
    });

    expect(
      screen
        .getAllByTestId(/township-place-mamelodi-(a|b|c)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi Alpha"),
      expect.stringContaining("Mamelodi Beta"),
      expect.stringContaining("Mamelodi Charlie"),
    ]);

    fireEvent.change(screen.getByTestId("township-sort"), {
      target: { value: "commute-asc" },
    });

    expect(
      screen
        .getAllByTestId(/township-place-mamelodi-(a|b|c)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi Alpha"),
      expect.stringContaining("Mamelodi Beta"),
      expect.stringContaining("Mamelodi Charlie"),
    ]);
  });

  it("reorders included areas when the sort option changes", () => {
    render(
      <TownshipBrowser
        townships={townships}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByTestId(/township-group-(mamelodi|soshanguve)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Soshanguve"),
      expect.stringContaining("Mamelodi"),
    ]);

    fireEvent.change(screen.getByTestId("township-sort"), {
      target: { value: "name-asc" },
    });

    expect(
      screen
        .getAllByTestId(/township-group-(mamelodi|soshanguve)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi"),
      expect.stringContaining("Soshanguve"),
    ]);
  });
});
