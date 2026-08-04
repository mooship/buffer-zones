import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
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

interface DragSequenceOptions {
  pointerId?: number;
  pointerType?: string;
  downY: number;
  moveY?: number;
  upY?: number;
  button?: number;
}

/** Fires a pointerdown/pointermove/pointerup (or pointercancel) sequence against `handle`, matching how a real touch drag dispatches events. */
function dragHandle(
  handle: HTMLElement,
  {
    pointerId = 1,
    pointerType = "touch",
    downY,
    moveY,
    upY,
    button = 0,
  }: DragSequenceOptions,
) {
  fireEvent.pointerDown(handle, {
    pointerType,
    pointerId,
    clientY: downY,
    button,
  });
  if (moveY !== undefined) {
    fireEvent.pointerMove(window, { pointerType, pointerId, clientY: moveY });
  }
  if (upY !== undefined) {
    fireEvent.pointerUp(window, { pointerType, pointerId, clientY: upY });
  }
}

describe("useSwipeToDismiss", () => {
  it("tracks downward drag offset while dragging", async () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { downY: 100, moveY: 130 });

    expect(handle).toHaveAttribute("data-dragging", "true");
    await waitFor(() => expect(handle).toHaveTextContent("drag offset: 30"));
  });

  it("calls onDismiss when released past the threshold", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { downY: 100, moveY: 150, upY: 150 });

    expect(screen.getByTestId("dismissed")).toHaveTextContent("true");
    expect(handle).toHaveAttribute("data-dragging", "false");
    expect(handle).toHaveTextContent("drag offset: 0");
  });

  it("snaps back without dismissing when released under the threshold", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { downY: 100, moveY: 115, upY: 115 });

    expect(screen.getByTestId("dismissed")).toHaveTextContent("false");
    expect(handle).toHaveTextContent("drag offset: 0");
  });

  it("ignores drag gestures when disabled", () => {
    render(<TestHandle enabled={false} />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { downY: 100, moveY: 150 });

    expect(handle).toHaveAttribute("data-dragging", "false");
    expect(handle).toHaveTextContent("drag offset: 0");
  });

  it("ignores non-primary mouse buttons", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { pointerType: "mouse", downY: 100, button: 2 });

    expect(handle).toHaveAttribute("data-dragging", "false");
  });

  it("cancels the drag on pointercancel without dismissing", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { downY: 100, moveY: 150 });
    fireEvent.pointerCancel(window, { pointerType: "touch", pointerId: 1 });

    expect(screen.getByTestId("dismissed")).toHaveTextContent("false");
    expect(handle).toHaveAttribute("data-dragging", "false");
  });

  it("ignores pointer events from a different pointer id", () => {
    render(<TestHandle />);
    const handle = screen.getByTestId("handle");

    dragHandle(handle, { pointerId: 1, downY: 100 });
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
  });
});
