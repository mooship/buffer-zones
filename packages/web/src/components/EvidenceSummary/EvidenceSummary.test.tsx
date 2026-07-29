import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceSummary } from "./EvidenceSummary";

describe("EvidenceSummary", () => {
  it("states that car time is a proxy and names the intended measure", () => {
    render(<EvidenceSummary metroName="Tshwane" jobCenterCount={6} />);

    expect(
      screen.getByText(/car time is only a baseline proxy/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nearest of 6 selected job centres/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/jobs reachable within 45, 60 and 90 minutes/i),
    ).toBeInTheDocument();
  });

  it("links to sourced historical context", () => {
    render(<EvidenceSummary metroName="Tshwane" jobCenterCount={6} />);

    expect(
      screen.getByRole("link", { name: /historical context/i }),
    ).toHaveAttribute("href", "https://sahistory.org.za/ref/A-0098760");
  });

  it("names the currently selected metro in the historical context copy", () => {
    render(<EvidenceSummary metroName="Johannesburg" jobCenterCount={6} />);

    expect(screen.getByText(/around johannesburg/i)).toBeInTheDocument();
  });
});
