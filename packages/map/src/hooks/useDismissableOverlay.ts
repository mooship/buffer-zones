import { type RefObject, useEffect } from "react";

/** Configuration for `useDismissableOverlay`. */
export interface UseDismissableOverlayOptions {
  /** Whether the overlay is currently open. */
  open: boolean;
  /** Called to close the overlay, on Escape or an outside pointerdown. */
  onClose: () => void;
  /** The overlay's own root element; a pointerdown inside it never closes it. */
  containerRef: RefObject<HTMLElement | null>;
  /** The element focus returns to when the overlay closes via Escape. */
  triggerRef: RefObject<HTMLElement | null>;
  /**
   * An element inside the overlay to move focus to when it opens (e.g. its
   * heading). Omit if the overlay manages its own initial focus.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Shared open/close behaviour for a disclosure-panel-style overlay
 * (`SettingsMenu`, `MobileLegend`): closes on Escape or a pointerdown outside
 * `containerRef`, restoring focus to `triggerRef`, and moves focus into
 * `initialFocusRef` when the overlay opens.
 */
export function useDismissableOverlay({
  open,
  onClose,
  containerRef,
  triggerRef,
  initialFocusRef,
}: UseDismissableOverlayOptions): void {
  useEffect(() => {
    if (!open) {
      return;
    }

    initialFocusRef?.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, containerRef, triggerRef, initialFocusRef]);
}
