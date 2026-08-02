import type { TownshipProperties } from "@stratum/app";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TownshipPopup } from "./TownshipPopup";

const properties: TownshipProperties = {
  id: "A",
  name: "Mamelodi SP",
  population: 334577,
  commuteMinutes: 62,
  nearestJobCenter: "Pretoria CBD",
  distanceKm: 28.4,
  nearestTransitKm: null,
  nearestAReYengStopKm: null,
};

describe("TownshipPopup", () => {
  it("shows name, population, modeled car time, and nearest job center", () => {
    render(<TownshipPopup properties={properties} />);

    expect(screen.getByText("Mamelodi SP")).toBeInTheDocument();
    expect(screen.getByText(/334[\s,]577/)).toBeInTheDocument();
    expect(screen.getByText("1h 2min")).toBeInTheDocument();
    expect(screen.getByText("Modeled car time")).toBeInTheDocument();
    expect(screen.getByText("Pretoria CBD")).toBeInTheDocument();
  });

  it("omits rows for values that have no data instead of inventing them", () => {
    render(
      <TownshipPopup
        properties={{ ...properties, population: undefined, distanceKm: null }}
      />,
    );

    expect(screen.queryByText(/population/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/distance/i)).not.toBeInTheDocument();
  });

  it("shows 'No data' when the modeled car time is unknown", () => {
    render(
      <TownshipPopup properties={{ ...properties, commuteMinutes: null }} />,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows the distance to nearest transit when it is known", () => {
    render(
      <TownshipPopup properties={{ ...properties, nearestTransitKm: 4.28 }} />,
    );

    expect(screen.getByText("Distance to nearest transit")).toBeInTheDocument();
    expect(screen.getByText("4.3 km")).toBeInTheDocument();
  });
});
