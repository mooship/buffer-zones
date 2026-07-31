import { BookOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../IconButton/IconButton";
import { Legend } from "../Legend/Legend";
import styles from "./MobileLegend.module.css";

interface MobileLegendProps {
  visibleLayerIds: string[];
  suppressed: boolean;
  panelOpen: boolean;
  panelExpanded: boolean;
}

export function MobileLegend({
  visibleLayerIds,
  suppressed,
  panelOpen,
  panelExpanded,
}: MobileLegendProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!suppressed) {
      return;
    }
    setOpen(false);
  }, [suppressed]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (suppressed) {
    return null;
  }

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
        >
          <h2 className={styles.title}>Map legend</h2>
          <Legend mode="active" visibleLayerIds={visibleLayerIds} compact />
        </section>
      ) : null}
    </div>
  );
}
