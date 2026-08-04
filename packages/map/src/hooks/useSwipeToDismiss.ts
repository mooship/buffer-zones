import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

/** Configuration for `useSwipeToDismiss`. */
export interface UseSwipeToDismissOptions {
  /** Whether the drag gesture should respond to pointer input at all. */
  enabled: boolean;
  /** Called once a downward drag past the dismiss threshold is released. */
  onDismiss: () => void;
}

/** State and pointer handlers returned by `useSwipeToDismiss`. */
export interface UseSwipeToDismissResult {
  /** Current downward drag distance in pixels, clamped to `[0, maxOffsetPx]`; 0 when not dragging. */
  dragOffsetPx: number;
  /** Whether a drag gesture is currently in progress. */
  dragging: boolean;
  /** Attach to the drag handle's `onPointerDown`. */
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

const DISMISS_THRESHOLD_PX = 40;
const MAX_DRAG_OFFSET_PX = 120;

/**
 * Drag-down-to-dismiss gesture for a mobile sheet's handle: tracks a single
 * pointer's vertical movement and calls `onDismiss` if it's released past
 * `DISMISS_THRESHOLD_PX`, otherwise `dragOffsetPx` snaps back to 0 so the
 * caller's CSS transition can animate the sheet back into place.
 * @remarks Deliberately simpler than a full velocity-projected drag (see
 *   `App.tsx`'s bottom-sheet gesture): this only ever dismisses, never
 *   resizes, so a plain distance threshold is enough.
 */
export function useSwipeToDismiss({
  enabled,
  onDismiss,
}: UseSwipeToDismissOptions): UseSwipeToDismissResult {
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!enabled) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const handleElement = event.currentTarget;
    const startY = event.clientY;
    activePointerIdRef.current = event.pointerId;
    setDragging(true);
    handleElement.setPointerCapture(event.pointerId);

    let latestDelta = 0;

    function handlePointerMove(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== activePointerIdRef.current) {
        return;
      }
      latestDelta = Math.max(
        0,
        Math.min(MAX_DRAG_OFFSET_PX, pointerEvent.clientY - startY),
      );
      setDragOffsetPx(latestDelta);
    }

    function cleanup() {
      setDragging(false);
      setDragOffsetPx(0);
      activePointerIdRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", cleanup);
      if (handleElement.hasPointerCapture(event.pointerId)) {
        handleElement.releasePointerCapture(event.pointerId);
      }
    }

    function handlePointerUp(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== activePointerIdRef.current) {
        return;
      }
      const shouldDismiss = latestDelta >= DISMISS_THRESHOLD_PX;
      cleanup();
      if (shouldDismiss) {
        onDismiss();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", cleanup);
  }

  return { dragOffsetPx, dragging, onPointerDown };
}
