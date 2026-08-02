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

    fireEvent.change(screen.getByTestId("township-sort"), {
      target: { value: "name-desc" },
    });

    expect(
      screen
        .getAllByTestId(/township-group-(mamelodi|soshanguve)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Soshanguve"),
      expect.stringContaining("Mamelodi"),
    ]);
  });

  it("sorts included areas by shortest commute first when commute-asc is selected", () => {
    render(
      <TownshipBrowser
        townships={townships}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("township-sort"), {
      target: { value: "commute-asc" },
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

  it("sorts places within a group by name descending", () => {
    const mamelodiTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-a",
          name: "Mamelodi Alpha",
          commuteMinutes: 10,
          nearestJobCenter: "Hatfield",
          distanceKm: 18.2,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-b",
          name: "Mamelodi Beta",
          commuteMinutes: 20,
          nearestJobCenter: "Hatfield",
          distanceKm: 18.2,
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
    fireEvent.change(screen.getByTestId("township-sort"), {
      target: { value: "name-desc" },
    });

    expect(
      screen
        .getAllByTestId(/township-place-mamelodi-(a|b)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi Beta"),
      expect.stringContaining("Mamelodi Alpha"),
    ]);
  });

  it("ties two places with no commute data by name", () => {
    const mamelodiTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-b",
          name: "Mamelodi Beta",
          commuteMinutes: null,
          nearestJobCenter: "Hatfield",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-a",
          name: "Mamelodi Alpha",
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
        .getAllByTestId(/township-place-mamelodi-(a|b)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi Alpha"),
      expect.stringContaining("Mamelodi Beta"),
    ]);
  });

  it("ties two places with equal, defined commute times by name", () => {
    const mamelodiTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-b",
          name: "Mamelodi Beta",
          commuteMinutes: 15,
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
          commuteMinutes: 15,
          nearestJobCenter: "Hatfield",
          distanceKm: 18.2,
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
        .getAllByTestId(/township-place-mamelodi-(a|b)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi Alpha"),
      expect.stringContaining("Mamelodi Beta"),
    ]);
  });

  it("places a township with a null commute time after one with a value", () => {
    // Deliberately listed null-commute-time first: Array.prototype.sort calls
    // the comparator with reversed arguments for a 2-element array, so this
    // ordering is what exercises the (secondMinutes === null) branch rather
    // than the (firstMinutes === null) one.
    const mamelodiTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-second",
          name: "Mamelodi Second",
          commuteMinutes: null,
          nearestJobCenter: "Hatfield",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi-first",
          name: "Mamelodi First",
          commuteMinutes: 10,
          nearestJobCenter: "Hatfield",
          distanceKm: 18.2,
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
        .getAllByTestId(/township-place-mamelodi-(first|second)/)
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi First"),
      expect.stringContaining("Mamelodi Second"),
    ]);
  });

  it("shows 'No modelled time' and ties groups by name when neither has commute data", () => {
    const noDataTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi",
          name: "Mamelodi",
          commuteMinutes: null,
          nearestJobCenter: "Hatfield",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "soshanguve",
          name: "Soshanguve",
          commuteMinutes: null,
          nearestJobCenter: "Rosslyn",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={noDataTownships}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    const groups = screen.getAllByTestId(
      /township-group-(mamelodi|soshanguve)/,
    );
    expect(groups.map((group) => group.textContent)).toEqual([
      expect.stringContaining("Mamelodi"),
      expect.stringContaining("Soshanguve"),
    ]);
    for (const group of groups) {
      expect(group).toHaveTextContent("No modelled time");
    }
  });

  it("sorts a group with no commute data after one that has it", () => {
    const townshipsWithOneUndefinedGroup = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi",
          name: "Mamelodi",
          commuteMinutes: null,
          nearestJobCenter: "Hatfield",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "soshanguve",
          name: "Soshanguve",
          commuteMinutes: 24,
          nearestJobCenter: "Rosslyn",
          distanceKm: 21.4,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={townshipsWithOneUndefinedGroup}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByTestId(/township-group-(mamelodi|soshanguve)/)
        .map((group) => group.textContent),
    ).toEqual([
      expect.stringContaining("Soshanguve"),
      expect.stringContaining("Mamelodi"),
    ]);
  });

  it("sorts a group with commute data before one with no data", () => {
    const townshipsWithOtherUndefinedGroup = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi",
          name: "Mamelodi",
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
          commuteMinutes: null,
          nearestJobCenter: "Rosslyn",
          distanceKm: null,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={townshipsWithOtherUndefinedGroup}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByTestId(/township-group-(mamelodi|soshanguve)/)
        .map((group) => group.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi"),
      expect.stringContaining("Soshanguve"),
    ]);
  });

  it("ties two groups with equal commute times by name", () => {
    const equalTimeTownships = [
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "mamelodi",
          name: "Mamelodi",
          commuteMinutes: 20,
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
          commuteMinutes: 20,
          nearestJobCenter: "Rosslyn",
          distanceKm: 21.4,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={equalTimeTownships}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByTestId(/township-group-(mamelodi|soshanguve)/)
        .map((group) => group.textContent),
    ).toEqual([
      expect.stringContaining("Mamelodi"),
      expect.stringContaining("Soshanguve"),
    ]);
  });

  it("excludes a township whose name doesn't resolve to any recognised township group", () => {
    const townshipsWithUngrouped = [
      ...townships,
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "nowhere",
          name: "Nowhere In Particular",
          commuteMinutes: 15,
          nearestJobCenter: "Hatfield",
          distanceKm: 5,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={townshipsWithUngrouped}
        selectedTownshipId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("township-group-nowhere-in-particular"),
    ).not.toBeInTheDocument();
  });

  it("selects an ungrouped township without expanding any group", () => {
    const townshipsWithUngrouped = [
      ...townships,
      {
        type: "Feature",
        geometry: null,
        properties: {
          id: "nowhere",
          name: "Nowhere In Particular",
          commuteMinutes: 15,
          nearestJobCenter: "Hatfield",
          distanceKm: 5,
          nearestTransitKm: null,
        },
      },
    ] as unknown as TownshipFeature[];

    render(
      <TownshipBrowser
        townships={townshipsWithUngrouped}
        selectedTownshipId="nowhere"
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nowhere In Particular" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("township-group-mamelodi")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
