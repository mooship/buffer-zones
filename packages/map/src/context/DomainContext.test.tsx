import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TEST_DOMAIN } from "../testFixtures/domain";
import { DomainProvider, useDomain } from "./DomainContext";

function Consumer() {
  const registry = useDomain();
  return <div data-testid="layer-id">{registry.getLayers()[0]?.id}</div>;
}

describe("DomainProvider / useDomain", () => {
  it("provides layer data to consumers", () => {
    render(
      <DomainProvider domain={TEST_DOMAIN}>
        <Consumer />
      </DomainProvider>,
    );
    expect(screen.getByTestId("layer-id")).toHaveTextContent("areas");
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
