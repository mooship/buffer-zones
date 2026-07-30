import type { LayerId } from "@buffer-zones/shared";
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

interface LegendProps {
  mode?: "all" | "active";
  visibleLayerIds?: LayerId[];
  compact?: boolean;
}

function getTransitEntries(visibleLayerIds?: LayerId[]) {
  return getLayerDefinitions().flatMap((layer) =>
    layer.available &&
    layer.style?.kind === "line" &&
    (!visibleLayerIds || visibleLayerIds.includes(layer.id))
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

function getLegendAriaLabel(mode: "all" | "active", label: string) {
  if (mode === "active") {
    return `Active map layers legend: ${label}`;
  }
  return label;
}

export function Legend({
  mode = "all",
  visibleLayerIds = [],
  compact = false,
}: LegendProps) {
  const isActiveMode = mode === "active";
  const showCommuteLegend =
    !isActiveMode || visibleLayerIds.includes("townships");
  const showNearestTransitLegend =
    !isActiveMode || visibleLayerIds.includes("nearest-transit");
  const transitEntries = getTransitEntries(
    isActiveMode ? visibleLayerIds : undefined,
  );
  const hasAnyLegendSection =
    showCommuteLegend || showNearestTransitLegend || transitEntries.length > 0;

  return (
    <div className={styles.groups} data-compact={compact ? "true" : undefined}>
      {showCommuteLegend ? (
        <div>
          <h3 className={styles.groupTitle}>Modeled car time</h3>
          <ul
            className={styles.legend}
            aria-label={getLegendAriaLabel(
              mode,
              "Modeled car time to nearest job centre",
            )}
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
      ) : null}
      {showNearestTransitLegend ? (
        <div>
          <h3 className={styles.groupTitle}>Distance to nearest transit</h3>
          <ul
            className={styles.legend}
            aria-label={getLegendAriaLabel(
              mode,
              "Distance from each area to the nearest transit stop or station",
            )}
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
      ) : null}
      {transitEntries.length > 0 ? (
        <div className={styles.fullWidthGroup}>
          <h3 className={styles.groupTitle}>Transit routes</h3>
          <ul
            className={styles.legend}
            aria-label={getLegendAriaLabel(mode, "Transit route colors")}
          >
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
                    <span className={styles.symbolNote}>
                      {" "}
                      · line + stations
                    </span>
                  ) : (
                    <span className={styles.symbolNote}> · route only</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!hasAnyLegendSection ? (
        <p className={styles.empty}>Turn on layers to view their legend.</p>
      ) : null}
    </div>
  );
}
