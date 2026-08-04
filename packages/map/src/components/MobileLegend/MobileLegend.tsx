import { BookOpen, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDismissableOverlay } from "../../hooks/useDismissableOverlay";
import { useSwipeToDismiss } from "../../hooks/useSwipeToDismiss";
import { IconButton } from "../IconButton/IconButton";
import { Legend } from "../Legend/Legend";
import styles from "./MobileLegend.module.css";

interface MobileLegendProps {
  visibleLayerIds: string[];
  suppressed: boolean;
  panelOpen: boolean;
  panelExpanded: boolean;
}

/**
 * Collapsible bottom-sheet legend trigger for mobile viewports, showing only
 * the currently active layers when opened.
 * @remarks Must be rendered inside a `DomainProvider`.
 */
export function MobileLegend({
  visibleLayerIds,
  suppressed,
  panelOpen,
  panelExpanded,
}: MobileLegendProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!suppressed) {
      return;
    }
    setOpen(false);
  }, [suppressed]);

  const close = useCallback(() => setOpen(false), []);

  useDismissableOverlay({
    open,
    onClose: close,
    containerRef,
    triggerRef,
    initialFocusRef: titleRef,
  });

  const { dragOffsetPx, dragging, onPointerDown } = useSwipeToDismiss({
    enabled: open,
    onDismiss: close,
  });

  if (suppressed) {
    return null;
  }

  const dragStyle = {
    "--sheet-drag-offset": `${dragOffsetPx}px`,
  } as CSSProperties;

  return (
    <div
      className={styles.container}
      ref={containerRef}
      data-panel-open={panelOpen ? "true" : "false"}
      data-panel-size={panelExpanded ? "full" : "medium"}
    >
      <IconButton
        ref={triggerRef}
        className={styles.trigger}
        data-testid="mobile-legend-trigger"
        data-e2e="mobile-legend-trigger"
        aria-expanded={open}
        aria-controls="mobile-legend-content"
        label={open ? "Close map legend" : "Open map legend"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
      </IconButton>
      {open ? (
        <section
          id="mobile-legend-content"
          className={styles.sheet}
          aria-label="Map legend"
          data-testid="mobile-legend-content"
          data-e2e="mobile-legend-content"
          data-dragging={dragging ? "true" : "false"}
          style={dragStyle}
        >
          <button
            type="button"
            className={styles.dragHandleButton}
            data-testid="mobile-legend-drag-handle"
            aria-label="Close map legend"
            onPointerDown={onPointerDown}
            onClick={close}
          >
            <span className={styles.dragHandle} aria-hidden="true" />
          </button>
          <h2 className={styles.title} ref={titleRef} tabIndex={-1}>
            Map legend
          </h2>
          <Legend mode="active" visibleLayerIds={visibleLayerIds} compact />
        </section>
      ) : null}
    </div>
  );
}
