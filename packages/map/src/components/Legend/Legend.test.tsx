import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainProvider } from "../../context/DomainContext";
import { Legend } from "./Legend";

function withDomain(ui: React.ReactElement) {
  return (
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>{ui}</DomainProvider>
  );
}

describe("Legend", () => {
  it("renders each choropleth layer's bucket labels and colors from its style config", () => {
    render(withDomain(<Legend />));
    expect(
      screen.getByRole("list", { name: /Modeled car time/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: /Distance to Nearest Transit/i }),
    ).toBeInTheDocument();
  });

  it("shows a No data swatch for every choropleth layer", () => {
    render(withDomain(<Legend />));
    expect(screen.getAllByText("No data")).toHaveLength(2);
    for (const entry of screen.getAllByText("No data")) {
      expect(entry.previousElementSibling).toHaveStyle({
        backgroundColor: "#8A93A5",
      });
    }
  });

  it("renders one transit entry per line layer with label and color", () => {
    render(withDomain(<Legend />));
    expect(screen.getByText("Rapid Rail")).toBeInTheDocument();
    expect(screen.getByText("Rapid Rail").closest("li")).toHaveTextContent(
      "line + stations",
    );
    expect(screen.getByText("Bus").closest("li")).toHaveTextContent(
      "route only",
    );
  });

  it("marks rapid-rail and commuter-rail as line + stations via hasPointGeometry", () => {
    render(withDomain(<Legend />));
    expect(screen.getByText("Commuter Rail").closest("li")).toHaveTextContent(
      "line + stations",
    );
    expect(
      screen.getByText("Bus Rapid Transit").closest("li"),
    ).toHaveTextContent("route only");
  });

  it("in active mode, shows only visible layer sections", () => {
    render(
      withDomain(<Legend mode="active" visibleLayerIds={["townships"]} />),
    );
    expect(
      screen.getByRole("list", { name: /Active map layers legend/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Rapid Rail")).not.toBeInTheDocument();
  });

  it("shows empty-state message when no layers are active", () => {
    render(withDomain(<Legend mode="active" visibleLayerIds={[]} />));
    expect(
      screen.getByText("Turn on layers to view their legend."),
    ).toBeInTheDocument();
  });
});
