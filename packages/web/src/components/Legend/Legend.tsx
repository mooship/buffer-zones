import { COMMUTE_BUCKET_COLORS } from "../../constants/colorScale";
import { LAYER_REGISTRY } from "../../layers/registry";
import styles from "./Legend.module.css";

const ENTRIES = [
  { label: "Short (≤ 20 min)", color: COMMUTE_BUCKET_COLORS.short },
  { label: "Moderate (21–40 min)", color: COMMUTE_BUCKET_COLORS.moderate },
  { label: "Long (41–60 min)", color: COMMUTE_BUCKET_COLORS.long },
  { label: "Very long (> 60 min)", color: COMMUTE_BUCKET_COLORS.veryLong },
  { label: "No data", color: COMMUTE_BUCKET_COLORS.noData },
] as const;

const TRANSIT_ENTRIES = LAYER_REGISTRY.flatMap((layer) =>
  layer.available && layer.style?.kind === "line"
    ? [{ label: layer.label, color: layer.style.color }]
    : [],
);

export function Legend() {
  return (
    <div className={styles.groups}>
      <div>
        <h3 className={styles.groupTitle}>Modeled car time</h3>
        <ul
          className={styles.legend}
          aria-label="Modeled car time to nearest job centre"
        >
          {ENTRIES.map((entry) => (
            <li key={entry.label} className={styles.entry}>
              <span
                className={styles.swatch}
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className={styles.label}>{entry.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className={styles.groupTitle}>Transit routes</h3>
        <ul className={styles.legend} aria-label="Transit route colors">
          {TRANSIT_ENTRIES.map((entry) => (
            <li key={entry.label} className={styles.entry}>
              <span
                className={styles.lineSwatch}
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className={styles.label}>{entry.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
