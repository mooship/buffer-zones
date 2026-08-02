import type { DomainConfig } from "@stratum/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DomainProvider, useDomain } from "./DomainContext";

const domain: DomainConfig = {
  layers: [
    {
      id: "test-layer",
      label: "Test",
      dataSource: ["/data/test.geojson"],
      geometryKind: "line",
      defaultVisible: true,
      available: true,
      style: { kind: "line", color: "#000", weight: 1, legendLabel: "Test" },
    },
  ],
  layerGroups: [],
};

function Consumer() {
  const registry = useDomain();
  return <div data-testid="layer-id">{registry.getLayers()[0]?.id}</div>;
}

describe("DomainProvider / useDomain", () => {
  it("provides layer data to consumers", () => {
    render(
      <DomainProvider domain={domain}>
        <Consumer />
      </DomainProvider>,
    );
    expect(screen.getByTestId("layer-id")).toHaveTextContent("test-layer");
  });

  it("throws when useDomain is called outside a DomainProvider", () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Consumer />)).toThrow(
      "useDomain must be used inside DomainProvider",
    );
    console.error = consoleError;
  });
});
