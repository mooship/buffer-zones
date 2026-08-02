import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("calls onChange with the selected theme", () => {
    const onChange = vi.fn();
    render(<ThemeToggle preference="system" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("theme-option-dark"));

    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("marks the active preference as pressed", () => {
    render(<ThemeToggle preference="light" onChange={vi.fn()} />);

    expect(screen.getByTestId("theme-option-light")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("theme-option-system")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("theme-option-dark")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
