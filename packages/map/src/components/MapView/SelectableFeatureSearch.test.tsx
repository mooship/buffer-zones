import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectableFeatureSearch } from "./SelectableFeatureSearch";

const FEATURES = [
  { id: "a", label: "Alexandra" },
  { id: "b", label: "Atteridgeville" },
  { id: "c", label: "Diepsloot" },
  { id: "d", label: "Mamelodi" },
];

describe("SelectableFeatureSearch", () => {
  it("exposes a combobox with no results below the minimum query length", () => {
    render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    fireEvent.change(input, { target: { value: "a" } });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("filters case-insensitively and shows matching results", () => {
    render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "ALE" },
    });

    expect(
      screen.getByRole("option", { name: "Alexandra" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Diepsloot" })).toBeNull();
  });

  it("caps rendered results and shows a truncation hint when more match", () => {
    const manyFeatures = Array.from({ length: 20 }, (_, index) => ({
      id: `t${index}`,
      label: `Township ${index}`,
    }));

    render(
      <SelectableFeatureSearch
        features={manyFeatures}
        selectedFeatureId={null}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Township" },
    });

    expect(screen.getAllByRole("option").length).toBeLessThan(20);
    expect(screen.getByText(/narrow your search/i)).toBeVisible();
  });

  it("moves aria-activedescendant with ArrowDown/ArrowUp and selects the active option on Enter", () => {
    const onSelect = vi.fn();
    render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId={null}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "le" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const firstOption = screen.getByRole("option", { name: "Alexandra" });
    expect(input).toHaveAttribute("aria-activedescendant", firstOption.id);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const secondOption = screen.getByRole("option", {
      name: "Atteridgeville",
    });
    expect(input).toHaveAttribute("aria-activedescendant", secondOption.id);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", firstOption.id);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("selects a feature on option click", () => {
    const onSelect = vi.fn();
    render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Mamelodi" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Mamelodi" }));

    expect(onSelect).toHaveBeenCalledWith("d");
  });

  it("clears the query on Escape", () => {
    render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ale" } });
    expect(screen.getByRole("option", { name: "Alexandra" })).toBeVisible();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("announces the selected feature's label via a live region, independent of the current query", () => {
    const { rerender } = render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("");

    rerender(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId="d"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      /mamelodi selected/i,
    );
  });

  it("does not throw when selectedFeatureId doesn't match any known feature", () => {
    render(
      <SelectableFeatureSearch
        features={FEATURES}
        selectedFeatureId="unknown"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("");
  });
});
