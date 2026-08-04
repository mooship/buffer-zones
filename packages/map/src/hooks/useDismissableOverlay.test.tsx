import { act, render } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDismissableOverlay } from "./useDismissableOverlay";

function TestOverlay({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useDismissableOverlay({
    open,
    onClose: () => setOpen(false),
    containerRef,
    triggerRef,
    initialFocusRef: headingRef,
  });

  return (
    <div>
      <button type="button" ref={triggerRef}>
        trigger
      </button>
      <div ref={containerRef}>
        {open ? (
          <section>
            <h2 ref={headingRef} tabIndex={-1}>
              panel
            </h2>
            <button type="button">inside</button>
          </section>
        ) : null}
      </div>
      <button type="button">outside</button>
    </div>
  );
}

describe("useDismissableOverlay", () => {
  it("moves focus into the panel when it opens", () => {
    const { getByText } = render(<TestOverlay />);
    expect(document.activeElement).toBe(getByText("panel"));
  });

  it("closes and restores focus to the trigger on Escape", () => {
    const { getByText, queryByText } = render(<TestOverlay />);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(queryByText("panel")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(getByText("trigger"));
  });

  it("closes on a pointerdown outside the container", () => {
    const { getByText, queryByText } = render(<TestOverlay />);

    act(() => {
      getByText("outside").dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });

    expect(queryByText("panel")).not.toBeInTheDocument();
  });

  it("does not close on a pointerdown inside the container", () => {
    const { getByText, queryByText } = render(<TestOverlay />);

    act(() => {
      getByText("inside").dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });

    expect(queryByText("panel")).toBeInTheDocument();
  });

  it("does nothing when closed", () => {
    render(<TestOverlay initialOpen={false} />);
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    addEventListenerSpy.mockRestore();
  });
});
