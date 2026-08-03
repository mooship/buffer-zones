import { Legend } from "../Legend/Legend";
import styles from "./DesktopLegend.module.css";

interface DesktopLegendProps {
  visibleLayerIds: string[];
  /** Hides the panel, e.g. while another bottom-left overlay (Settings) is open over it. */
  suppressed?: boolean;
}

/**
 * Always-visible legend panel for desktop viewports, showing only the
 * currently active layers.
 * @remarks Must be rendered inside a `DomainProvider`.
 */
export function DesktopLegend({
  visibleLayerIds,
  suppressed = false,
}: DesktopLegendProps) {
  if (suppressed) {
    return null;
  }

  return (
    <section
      className={styles.container}
      aria-label="Map legend"
      data-testid="desktop-legend"
      data-e2e="desktop-legend"
    >
      <h2 className={styles.title}>Map legend</h2>
      <Legend mode="active" visibleLayerIds={visibleLayerIds} compact />
    </section>
  );
}
