import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { DomainProvider } from "../../context/DomainContext";
import { DesktopLegend } from "./DesktopLegend";

function withDomain(ui: ReactElement) {
  return (
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>{ui}</DomainProvider>
  );
}

describe("DesktopLegend", () => {
  it("renders the legend panel by default", () => {
    render(withDomain(<DesktopLegend visibleLayerIds={["townships"]} />));

    expect(screen.getByTestId("desktop-legend")).toBeInTheDocument();
  });

  it("renders nothing when suppressed", () => {
    render(
      withDomain(<DesktopLegend visibleLayerIds={["townships"]} suppressed />),
    );

    expect(screen.queryByTestId("desktop-legend")).not.toBeInTheDocument();
  });
});
