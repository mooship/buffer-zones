import { COMMUTE_BUCKET_COLORS } from "../../constants/colorScale";
import styles from "./Legend.module.css";

const ENTRIES = [
  { label: "Short (≤ 20 min)", color: COMMUTE_BUCKET_COLORS.short },
  { label: "Moderate (21–40 min)", color: COMMUTE_BUCKET_COLORS.moderate },
  { label: "Long (41–60 min)", color: COMMUTE_BUCKET_COLORS.long },
  { label: "Very long (> 60 min)", color: COMMUTE_BUCKET_COLORS.veryLong },
  { label: "No data", color: COMMUTE_BUCKET_COLORS.noData },
] as const;

export function Legend() {
  return (
    <ul
      className={styles.legend}
      aria-label="Commute time to nearest job centre"
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
  );
}
