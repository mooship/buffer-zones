import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceSummary } from "./EvidenceSummary";

describe("EvidenceSummary", () => {
  it("states that car time is a proxy and names the intended measure", () => {
    render(<EvidenceSummary />);

    expect(
      screen.getByText(/car time is only a baseline proxy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/jobs reachable within 45, 60 and 90 minutes/i),
    ).toBeInTheDocument();
  });

  it("links to sourced historical context", () => {
    render(<EvidenceSummary />);

    expect(
      screen.getByRole("link", { name: /historical context/i }),
    ).toHaveAttribute("href", "https://sahistory.org.za/ref/A-0098760");
  });
});
