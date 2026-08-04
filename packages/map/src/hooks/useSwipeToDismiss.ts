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
 *   resizes, so a plain distance threshold is enough. `dragOffsetPx` updates
 *   are batched to one `requestAnimationFrame` per frame (like that same
 *   `App.tsx` gesture's `scheduleSheetDragOffset`) so a burst of pointermove
 *   events doesn't force a React re-render each; `dragging` flips
 *   synchronously on pointerdown/up since it isn't a per-pixel value.
 */
export function useSwipeToDismiss({
  enabled,
  onDismiss,
}: UseSwipeToDismissOptions): UseSwipeToDismissResult {
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pendingOffsetRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  function scheduleOffset(nextOffset: number) {
    pendingOffsetRef.current = nextOffset;
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = requestAnimationFrame(() => {
      setDragOffsetPx(pendingOffsetRef.current);
      frameRef.current = null;
    });
  }

  function cancelScheduledOffset() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!enabled) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const handleElement = event.currentTarget;
    const pointerId = event.pointerId;
    const startY = event.clientY;
    let latestDelta = 0;
    setDragging(true);
    handleElement.setPointerCapture(pointerId);

    function handlePointerMove(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }
      latestDelta = Math.max(
        0,
        Math.min(MAX_DRAG_OFFSET_PX, pointerEvent.clientY - startY),
      );
      scheduleOffset(latestDelta);
    }

    function cleanup() {
      cancelScheduledOffset();
      setDragging(false);
      setDragOffsetPx(0);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", cleanup);
      if (handleElement.hasPointerCapture(pointerId)) {
        handleElement.releasePointerCapture(pointerId);
      }
    }

    function handlePointerUp(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== pointerId) {
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
