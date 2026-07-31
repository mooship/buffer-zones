import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ControlButton } from "./ControlButton";

describe("ControlButton", () => {
  it("uses visible text as the accessible name for pill buttons", () => {
    render(<ControlButton shape="pill">Explore</ControlButton>);

    expect(screen.getByRole("button", { name: "Explore" })).toHaveAttribute(
      "data-shape",
      "pill",
    );
  });

  it("uses the explicit label for icon-only buttons", () => {
    render(
      <ControlButton label="Open settings">
        <span aria-hidden="true">S</span>
      </ControlButton>,
    );

    expect(
      screen.getByRole("button", { name: "Open settings" }),
    ).toHaveAttribute("data-shape", "icon");
  });

  it("supports embedded variant semantics", () => {
    render(
      <ControlButton variant="embedded" label="Close panel">
        <span aria-hidden="true">X</span>
      </ControlButton>,
    );

    expect(screen.getByRole("button", { name: "Close panel" })).toHaveAttribute(
      "data-variant",
      "embedded",
    );
  });
});
