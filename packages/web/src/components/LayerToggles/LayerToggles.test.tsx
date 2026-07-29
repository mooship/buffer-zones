import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayerToggles } from "./LayerToggles";

describe("LayerToggles", () => {
  it("renders one toggle per registry entry, reflecting current visibility", () => {
    render(
      <LayerToggles
        visibleLayerIds={["townships"]}
        metroId="tshwane"
        onToggle={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Modeled car time" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Gautrain" }),
    ).not.toBeChecked();
  });

  it("calls onToggle with the layer id when a toggle is clicked", () => {
    const onToggle = vi.fn();
    render(
      <LayerToggles
        visibleLayerIds={[]}
        metroId="tshwane"
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "A Re Yeng" }));

    expect(onToggle).toHaveBeenCalledWith("a-re-yeng");
  });

  it("disables layers that have no data yet and explains why", () => {
    render(
      <LayerToggles
        visibleLayerIds={[]}
        metroId="tshwane"
        onToggle={vi.fn()}
      />,
    );

    const myciti = screen.getByRole("checkbox", { name: /MyCiTi/ });

    expect(myciti).toBeDisabled();
    expect(screen.getAllByText("Not yet available").length).toBeGreaterThan(0);
  });

  it("does not call onToggle for an unavailable layer", () => {
    const onToggle = vi.fn();
    render(
      <LayerToggles
        visibleLayerIds={[]}
        metroId="tshwane"
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /MyCiTi/ }));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("omits a metro-specific operator entirely for a metro it doesn't serve", () => {
    render(
      <LayerToggles
        visibleLayerIds={[]}
        metroId="johannesburg"
        onToggle={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("checkbox", { name: "A Re Yeng" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Rea Vaya" }),
    ).toBeInTheDocument();
  });
});
