import type { MetroId } from "@buffer-zones/shared";
import {
  COMMUTE_BUCKET_COLORS,
  TRANSIT_DISTANCE_BUCKET_COLORS,
} from "../../constants/colorScale";
import { STATION_LAYER_IDS } from "../../constants/layerStyles";
import { getLayerDefinitions } from "../../layers/registry";
import styles from "./Legend.module.css";

const ENTRIES = [
  { label: "Short (≤ 20 min)", color: COMMUTE_BUCKET_COLORS.short },
  { label: "Moderate (21–40 min)", color: COMMUTE_BUCKET_COLORS.moderate },
  { label: "Long (41–60 min)", color: COMMUTE_BUCKET_COLORS.long },
  { label: "Very long (> 60 min)", color: COMMUTE_BUCKET_COLORS.veryLong },
  { label: "No data", color: COMMUTE_BUCKET_COLORS.noData },
] as const;

const TRANSIT_DISTANCE_ENTRIES = [
  { label: "Near (≤ 1 km)", color: TRANSIT_DISTANCE_BUCKET_COLORS.near },
  {
    label: "Moderate (1–3 km)",
    color: TRANSIT_DISTANCE_BUCKET_COLORS.moderate,
  },
  { label: "Far (3–8 km)", color: TRANSIT_DISTANCE_BUCKET_COLORS.far },
  { label: "Very far (> 8 km)", color: TRANSIT_DISTANCE_BUCKET_COLORS.veryFar },
  { label: "No data", color: TRANSIT_DISTANCE_BUCKET_COLORS.noData },
] as const;

function getTransitEntries(metroId: MetroId) {
  return getLayerDefinitions(metroId).flatMap((layer) =>
    layer.available && layer.style?.kind === "line"
      ? [
          {
            label: layer.label,
            color: layer.style.color,
            hasStations: STATION_LAYER_IDS.includes(layer.id),
          },
        ]
      : [],
  );
}

interface LegendProps {
  metroId: MetroId;
}

export function Legend({ metroId }: LegendProps) {
  const transitEntries = getTransitEntries(metroId);

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
        <h3 className={styles.groupTitle}>Distance to nearest transit</h3>
        <ul
          className={styles.legend}
          aria-label="Distance from each area to the nearest transit stop or station"
        >
          {TRANSIT_DISTANCE_ENTRIES.map((entry) => (
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
      <div className={styles.fullWidthGroup}>
        <h3 className={styles.groupTitle}>Transit routes</h3>
        <ul className={styles.legend} aria-label="Transit route colors">
          {transitEntries.map((entry) => (
            <li key={entry.label} className={styles.entry}>
              <span className={styles.symbolGroup} aria-hidden="true">
                <span
                  className={styles.lineSwatch}
                  style={{ backgroundColor: entry.color }}
                />
                {entry.hasStations ? (
                  <span
                    className={styles.dotSwatch}
                    style={{ backgroundColor: entry.color }}
                  />
                ) : null}
              </span>
              <span className={styles.label}>
                {entry.label}
                {entry.hasStations ? (
                  <span className={styles.symbolNote}> · line + stations</span>
                ) : (
                  <span className={styles.symbolNote}> · route only</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
