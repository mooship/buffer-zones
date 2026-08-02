import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayerToggles } from "./LayerToggles";

describe("LayerToggles", () => {
  it("reflects visibility state on each layer's checkbox", () => {
    render(<LayerToggles visibleLayerIds={["townships"]} onToggle={vi.fn()} />);

    expect(screen.getByTestId("layer-toggle-townships")).toBeChecked();
    expect(screen.getByTestId("layer-toggle-rapid-rail")).not.toBeChecked();
  });

  it("calls onToggle with the layer id when its checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<LayerToggles visibleLayerIds={[]} onToggle={onToggle} />);

    screen.getByTestId("layer-toggle-rapid-rail").click();

    expect(onToggle).toHaveBeenCalledWith("rapid-rail");
  });

  it("shows no failure badge by default", () => {
    render(<LayerToggles visibleLayerIds={[]} onToggle={vi.fn()} />);

    expect(
      screen.queryByTestId("layer-toggle-rapid-rail-error"),
    ).not.toBeInTheDocument();
  });

  it("shows a failure badge for a layer whose data failed to load", () => {
    render(
      <LayerToggles
        visibleLayerIds={["rapid-rail"]}
        onToggle={vi.fn()}
        failedLayerIds={["rapid-rail"]}
      />,
    );

    expect(
      screen.getByTestId("layer-toggle-rapid-rail-error"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("layer-toggle-bus-error"),
    ).not.toBeInTheDocument();
  });
});
