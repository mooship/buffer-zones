import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { DomainProvider } from "../../context/DomainContext";
import { TEST_DOMAIN } from "../../testFixtures/domain";
import { DesktopLegend } from "./DesktopLegend";

function withDomain(ui: ReactElement) {
  return <DomainProvider domain={TEST_DOMAIN}>{ui}</DomainProvider>;
}

describe("DesktopLegend", () => {
  it("renders the legend panel by default", () => {
    render(withDomain(<DesktopLegend visibleLayerIds={["areas"]} />));

    expect(screen.getByTestId("desktop-legend")).toBeInTheDocument();
  });

  it("renders nothing when suppressed", () => {
    render(
      withDomain(<DesktopLegend visibleLayerIds={["areas"]} suppressed />),
    );

    expect(screen.queryByTestId("desktop-legend")).not.toBeInTheDocument();
  });
});
