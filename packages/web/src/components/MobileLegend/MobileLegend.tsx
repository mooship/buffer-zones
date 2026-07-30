import type { LayerId } from "@buffer-zones/shared";
import { BookOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Legend } from "../Legend/Legend";
import styles from "./MobileLegend.module.css";

interface MobileLegendProps {
  visibleLayerIds: LayerId[];
  suppressed: boolean;
}

export function MobileLegend({
  visibleLayerIds,
  suppressed,
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
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        data-testid="mobile-legend-trigger"
        data-e2e="mobile-legend-trigger"
        aria-expanded={open}
        aria-controls="mobile-legend-content"
        aria-label={open ? "Close map legend" : "Open map legend"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
      </button>
      {open ? (
        <section
          id="mobile-legend-content"
          className={styles.sheet}
          aria-label="Map legend"
          data-testid="mobile-legend-content"
          data-e2e="mobile-legend-content"
        >
          <div className={styles.header}>
            <h2 className={styles.title}>Map legend</h2>
            <button
              type="button"
              className={styles.closeButton}
              data-testid="mobile-legend-close"
              data-e2e="mobile-legend-close"
              onClick={() => setOpen(false)}
            >
              Close map legend
            </button>
          </div>
          <Legend mode="active" visibleLayerIds={visibleLayerIds} compact />
        </section>
      ) : null}
    </div>
  );
}
