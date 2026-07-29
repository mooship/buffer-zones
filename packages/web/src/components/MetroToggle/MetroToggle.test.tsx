import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetroToggle } from "./MetroToggle";

describe("MetroToggle", () => {
  it("marks the current metro as pressed", () => {
    render(<MetroToggle metroId="tshwane" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Tshwane metro" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Johannesburg metro" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the clicked metro id", () => {
    const onChange = vi.fn();
    render(<MetroToggle metroId="tshwane" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Johannesburg metro" }));

    expect(onChange).toHaveBeenCalledWith("johannesburg");
  });
});
