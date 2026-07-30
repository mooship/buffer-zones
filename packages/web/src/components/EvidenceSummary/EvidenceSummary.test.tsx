import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceSummary } from "./EvidenceSummary";

describe("EvidenceSummary", () => {
  it("states how many job centres the drive time is measured against", () => {
    render(<EvidenceSummary jobCenterCount={18} />);

    expect(screen.getByText(/nearest of 18/)).toBeInTheDocument();
  });

  it("warns that transit mapping coverage differs between metros", () => {
    render(<EvidenceSummary jobCenterCount={18} />);

    expect(screen.getByText(/not mapped evenly/)).toBeInTheDocument();
    expect(screen.getByText(/Ekurhuleni/)).toBeInTheDocument();
  });
});
