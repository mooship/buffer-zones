import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("calls onChange with the selected theme", () => {
    const onChange = vi.fn();
    render(<ThemeToggle preference="system" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /dark theme/i }));

    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("marks the active preference as pressed", () => {
    render(<ThemeToggle preference="light" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /light theme/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /system theme/i }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /dark theme/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
