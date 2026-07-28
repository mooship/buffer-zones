import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Legend } from "./Legend";

describe("Legend", () => {
  it("renders one entry per commute bucket", () => {
    render(<Legend />);

    expect(screen.getByText(/short/i)).toBeInTheDocument();
    expect(screen.getByText(/moderate/i)).toBeInTheDocument();
    expect(screen.getByText(/^long/i)).toBeInTheDocument();
    expect(screen.getByText(/very long/i)).toBeInTheDocument();
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it("labels the legend for assistive technology", () => {
    render(<Legend />);

    expect(
      screen.getByRole("list", { name: /modeled car time/i }),
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
    expect(transitLegend).toHaveTextContent("A Re Yeng trunk");
  });
});
