import {
  CHOROPLETH_NO_DATA_COLOR,
  STATION_LAYER_IDS,
} from "../../constants/layerStyles";
import { getLayers } from "../../layers/registry";
import styles from "./Legend.module.css";

interface LegendProps {
  mode?: "all" | "active";
  visibleLayerIds?: string[];
  compact?: boolean;
}

function choroplethLegends(visibleLayerIds?: string[]) {
  return getLayers().flatMap((layer) => {
    if (layer.style.kind !== "choropleth") {
      return [];
    }
    if (visibleLayerIds && !visibleLayerIds.includes(layer.id)) {
      return [];
    }
    return [
      {
        layer,
        entries: [
          ...layer.style.buckets,
          { label: "No data", color: CHOROPLETH_NO_DATA_COLOR },
        ],
      },
    ];
  });
}

function getTransitEntries(visibleLayerIds?: string[]) {
  return getLayers().flatMap((layer) =>
    layer.available &&
    layer.style.kind === "line" &&
    (!visibleLayerIds || visibleLayerIds.includes(layer.id))
      ? [
          {
            label: layer.style.legendLabel,
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
  const choroplethSections = choroplethLegends(
    isActiveMode ? visibleLayerIds : undefined,
  );
  const transitEntries = getTransitEntries(
    isActiveMode ? visibleLayerIds : undefined,
  );
  const hasAnyLegendSection =
    choroplethSections.length > 0 || transitEntries.length > 0;

  return (
    <div className={styles.groups} data-compact={compact ? "true" : undefined}>
      {choroplethSections.map(({ layer, entries }) => (
        <div key={layer.id}>
          <h3 className={styles.groupTitle}>{layer.label}</h3>
          <ul
            className={styles.legend}
            aria-label={getLegendAriaLabel(
              mode,
              layer.description ?? layer.label,
            )}
          >
            {entries.map((entry) => (
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
      ))}
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
