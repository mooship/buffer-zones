import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("uses icon shape and explicit accessible label", () => {
    render(
      <IconButton label="Open map legend">
        <span aria-hidden="true">L</span>
      </IconButton>,
    );

    expect(
      screen.getByRole("button", { name: "Open map legend" }),
    ).toHaveAttribute("data-shape", "icon");
  });

  it("passes variant through to the shared control button", () => {
    render(
      <IconButton label="Close" variant="embedded">
        <span aria-hidden="true">X</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute(
      "data-variant",
      "embedded",
    );
  });
});
