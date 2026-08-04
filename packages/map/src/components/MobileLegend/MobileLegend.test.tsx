import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { DomainProvider } from "../../context/DomainContext";
import { TEST_DOMAIN } from "../../testFixtures/domain";
import { MobileLegend } from "./MobileLegend";

function withDomain(ui: ReactElement) {
  return <DomainProvider domain={TEST_DOMAIN}>{ui}</DomainProvider>;
}

describe("MobileLegend", () => {
  it("is closed by default and toggles open state from the trigger", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    const trigger = screen.getByTestId("mobile-legend-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("mobile-legend-content"),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();
  });

  it("closes when clicking outside of the container", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    const trigger = screen.getByTestId("mobile-legend-trigger");
    fireEvent.click(trigger);
    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("mobile-legend-content"),
    ).not.toBeInTheDocument();
  });

  it("moves focus to the panel heading when it opens", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("mobile-legend-trigger"));

    expect(screen.getByText("Map legend")).toHaveFocus();
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    const trigger = screen.getByTestId("mobile-legend-trigger");
    fireEvent.click(trigger);
    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("mobile-legend-content"),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders nothing when suppressed", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    expect(
      screen.queryByTestId("mobile-legend-trigger"),
    ).not.toBeInTheDocument();
  });

  it("resets open state while suppressed, so it doesn't reappear already open", () => {
    const { rerender } = render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("mobile-legend-trigger"));
    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();

    rerender(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );
    expect(
      screen.queryByTestId("mobile-legend-trigger"),
    ).not.toBeInTheDocument();

    rerender(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    const trigger = screen.getByTestId("mobile-legend-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("mobile-legend-content"),
    ).not.toBeInTheDocument();
  });

  it("does not close when clicking inside the sheet", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("mobile-legend-trigger"));
    const content = screen.getByTestId("mobile-legend-content");

    fireEvent.mouseDown(content);

    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();
  });

  it("ignores non-Escape keys while open", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("mobile-legend-trigger"));

    fireEvent.keyDown(document, { key: "a" });

    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();
  });

  it("closes when the drag handle is swiped down past the threshold", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("mobile-legend-trigger"));
    const dragHandle = screen.getByTestId("mobile-legend-drag-handle");

    fireEvent.pointerDown(dragHandle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 150,
    });
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 150,
    });

    expect(
      screen.queryByTestId("mobile-legend-content"),
    ).not.toBeInTheDocument();
  });

  it("stays open when the drag handle moves less than the dismiss threshold", () => {
    render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen={false}
          panelExpanded={false}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId("mobile-legend-trigger"));
    const dragHandle = screen.getByTestId("mobile-legend-drag-handle");

    fireEvent.pointerDown(dragHandle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 110,
    });
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 110,
    });

    expect(screen.getByTestId("mobile-legend-content")).toBeInTheDocument();
  });

  it("reflects panelOpen and panelExpanded via data attributes", () => {
    const { container } = render(
      withDomain(
        <MobileLegend
          visibleLayerIds={["areas"]}
          suppressed={false}
          panelOpen
          panelExpanded
        />,
      ),
    );

    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-panel-open", "true");
    expect(root).toHaveAttribute("data-panel-size", "full");
  });
});
