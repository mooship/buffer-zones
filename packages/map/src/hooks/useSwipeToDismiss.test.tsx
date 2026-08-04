import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSwipeToDismiss } from "./useSwipeToDismiss";

function TestHandle({ enabled = true }: { enabled?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const { dragOffsetPx, dragging, onPointerDown } = useSwipeToDismiss({
    enabled,
    onDismiss: () => setDismissed(true),
  });

  return (
    <div>
      <button
        type="button"
        data-testid="handle"
        data-dragging={dragging ? "true" : "false"}
        onPointerDown={onPointerDown}
      >
        drag offset: {dragOffsetPx}
      </button>
      <div data-testid="dismissed">{dismissed ? "true" : "false"}</div>
    </div>
  );
}

describe("useSwipeToDismiss", () => {
  it("tracks downward drag offset while dragging", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 130,
    });

    expect(handle).toHaveAttribute("data-dragging", "true");
    expect(handle).toHaveTextContent("drag offset: 30");
  });

  it("calls onDismiss when released past the threshold", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
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

    expect(screen.getByTestId("dismissed")).toHaveTextContent("true");
    expect(handle).toHaveAttribute("data-dragging", "false");
    expect(handle).toHaveTextContent("drag offset: 0");
  });

  it("snaps back without dismissing when released under the threshold", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 115,
    });
    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 115,
    });

    expect(screen.getByTestId("dismissed")).toHaveTextContent("false");
    expect(handle).toHaveTextContent("drag offset: 0");
  });

  it("ignores drag gestures when disabled", () => {
    render(<TestHandle enabled={false} />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
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

    expect(handle).toHaveAttribute("data-dragging", "false");
    expect(handle).toHaveTextContent("drag offset: 0");
  });

  it("ignores non-primary mouse buttons", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
      pointerType: "mouse",
      pointerId: 1,
      clientY: 100,
      button: 2,
    });

    expect(handle).toHaveAttribute("data-dragging", "false");
  });

  it("cancels the drag on pointercancel without dismissing", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
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
    fireEvent.pointerCancel(window, {
      pointerType: "touch",
      pointerId: 1,
    });

    expect(screen.getByTestId("dismissed")).toHaveTextContent("false");
    expect(handle).toHaveAttribute("data-dragging", "false");
  });

  it("ignores pointer events from a different pointer id", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    fireEvent.pointerDown(handle, {
      pointerType: "touch",
      pointerId: 1,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerType: "touch",
      pointerId: 2,
      clientY: 150,
    });

    expect(handle).toHaveTextContent("drag offset: 0");

    fireEvent.pointerUp(window, {
      pointerType: "touch",
      pointerId: 2,
      clientY: 150,
    });

    expect(screen.getByTestId("dismissed")).toHaveTextContent("false");
    const dismissSpy = vi.fn();
    expect(dismissSpy).not.toHaveBeenCalled();
  });
});
