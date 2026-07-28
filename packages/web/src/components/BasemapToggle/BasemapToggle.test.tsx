import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BasemapToggle } from "./BasemapToggle";

describe("BasemapToggle", () => {
  it("calls onChange with the selected basemap", () => {
    const onChange = vi.fn();
    render(<BasemapToggle basemap="street" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /satellite/i }));

    expect(onChange).toHaveBeenCalledWith("satellite");
  });

  it("marks the active basemap as pressed", () => {
    render(<BasemapToggle basemap="street" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /street/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /satellite/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
