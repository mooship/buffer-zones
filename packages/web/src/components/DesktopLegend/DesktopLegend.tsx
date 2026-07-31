import { Legend } from "../Legend/Legend";
import styles from "./DesktopLegend.module.css";

interface DesktopLegendProps {
  visibleLayerIds: string[];
}

export function DesktopLegend({ visibleLayerIds }: DesktopLegendProps) {
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
