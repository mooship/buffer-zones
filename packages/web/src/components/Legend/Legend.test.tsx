import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Legend } from "./Legend";

describe("Legend", () => {
  it("renders one entry per commute bucket", () => {
    render(<Legend />);

    const commuteLegend = screen.getByRole("list", {
      name: /modeled car time/i,
    });
    expect(within(commuteLegend).getByText(/short/i)).toBeInTheDocument();
    expect(within(commuteLegend).getByText(/moderate/i)).toBeInTheDocument();
    expect(within(commuteLegend).getByText(/^long/i)).toBeInTheDocument();
    expect(within(commuteLegend).getByText(/very long/i)).toBeInTheDocument();
    expect(within(commuteLegend).getByText(/no data/i)).toBeInTheDocument();
  });

  it("labels the legend for assistive technology", () => {
    render(<Legend />);

    expect(
      screen.getByRole("list", { name: /modeled car time/i }),
    ).toBeInTheDocument();
  });

  it("renders one entry per distance-to-transit bucket", () => {
    render(<Legend />);

    const transitDistanceLegend = screen.getByRole("list", {
      name: /distance from each area to the nearest transit/i,
    });
    expect(
      within(transitDistanceLegend).getByText(/near/i),
    ).toBeInTheDocument();
    expect(
      within(transitDistanceLegend).getByText(/^moderate/i),
    ).toBeInTheDocument();
    expect(
      within(transitDistanceLegend).getByText(/^far/i),
    ).toBeInTheDocument();
    expect(
      within(transitDistanceLegend).getByText(/very far/i),
    ).toBeInTheDocument();
    expect(
      within(transitDistanceLegend).getByText(/no data/i),
    ).toBeInTheDocument();
  });

  it("shows the color assigned to every available transit route", () => {
    render(<Legend />);

    const transitLegend = screen.getByRole("list", {
      name: /transit route colors/i,
    });
    expect(transitLegend).toHaveTextContent("Gautrain");
    expect(transitLegend).toHaveTextContent("Gautrain Bus");
    expect(transitLegend).toHaveTextContent("PRASA Rail");
    expect(transitLegend).toHaveTextContent("A Re Yeng");
  });

  it("marks networks with real station data separately from route-only networks", () => {
    render(<Legend />);

    const transitLegend = screen.getByRole("list", {
      name: /transit route colors/i,
    });
    const gautrainRow = within(transitLegend)
      .getByText("Gautrain")
      .closest("li");
    const gautrainBusRow = within(transitLegend)
      .getByText("Gautrain Bus")
      .closest("li");
    expect(gautrainRow).toHaveTextContent("line + stations");
    expect(gautrainBusRow).toHaveTextContent("route only");
  });
});
