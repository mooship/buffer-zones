import type { TownshipFeature } from "@buffer-zones/shared";
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
      unemploymentRatePercent: null,
      nearestGautrainStationKm: null,
      nearestAReYengStopKm: null,
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
      unemploymentRatePercent: null,
      nearestGautrainStationKm: null,
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

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search townships" }),
      {
        target: { value: "mame" },
      },
    );

    expect(
      screen.getByRole("button", { name: /browse mamelodi/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /soshanguve/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/1 included area · 1 census sub-place/i),
    ).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /browse mamelodi/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /mamelodi, modeled car time/i }),
    );
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

    const group = screen.getByRole("button", { name: /browse mamelodi/i });
    expect(group).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(group);
    expect(group).toHaveAttribute("aria-expanded", "false");
  });
});
