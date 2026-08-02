import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

describe("SegmentedControl", () => {
  it("renders labelled options and marks the selected option as pressed", () => {
    render(
      <SegmentedControl
        label="Map style"
        options={[
          { id: "street", label: "Street" },
          { id: "satellite", label: "Satellite" },
        ]}
        value="street"
        onChange={vi.fn()}
        testId="map-style"
      />,
    );

    expect(screen.getByRole("group", { name: "Map style" })).toBeVisible();
    expect(screen.getByTestId("map-style-option-street")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("map-style-option-satellite")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the selected option id", () => {
    const onChange = vi.fn();

    render(
      <SegmentedControl
        label="Theme"
        options={[
          { id: "system", label: "System" },
          { id: "light", label: "Light" },
          { id: "dark", label: "Dark" },
        ]}
        value="system"
        onChange={onChange}
        testId="theme"
      />,
    );

    fireEvent.click(screen.getByTestId("theme-option-dark"));

    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("respects disabled options", () => {
    const onChange = vi.fn();

    render(
      <SegmentedControl
        label="Layer scope"
        options={[
          { id: "all", label: "All" },
          { id: "future", label: "Future", disabled: true },
        ]}
        value="all"
        onChange={onChange}
        testId="scope"
      />,
    );

    const disabledOption = screen.getByTestId("scope-option-future");
    expect(disabledOption).toBeDisabled();

    fireEvent.click(disabledOption);
    expect(onChange).not.toHaveBeenCalled();
  });
});
