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
      screen.getByRole("list", { name: /commute time/i }),
    ).toBeInTheDocument();
  });
});
