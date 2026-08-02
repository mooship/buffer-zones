import type { Layer } from "@stratum/core";
import { useDomain } from "../../context/DomainContext";
import styles from "./Legend.module.css";

const CHOROPLETH_NO_DATA_COLOR = "#8A93A5";

interface LegendProps {
  mode?: "all" | "active";
  visibleLayerIds?: string[];
  compact?: boolean;
}

function choroplethLegends(
  layers: readonly Layer[],
  visibleLayerIds?: string[],
) {
  return layers.flatMap((layer) => {
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

function getTransitEntries(
  layers: readonly Layer[],
  visibleLayerIds?: string[],
) {
  return layers.flatMap((layer) => {
    if (
      !layer.available ||
      layer.style.kind !== "line" ||
      (visibleLayerIds && !visibleLayerIds.includes(layer.id))
    ) {
      return [];
    }

    const { style } = layer;
    const hasStations = layer.hasPointGeometry === true;

    if (style.colorClassification?.kind === "categorized") {
      return style.colorClassification.stops.map((stop) => ({
        label: stop.label,
        color: stop.value,
        hasStations,
      }));
    }

    return [{ label: style.legendLabel, color: style.color, hasStations }];
  });
}

function getLegendAriaLabel(mode: "all" | "active", label: string) {
  if (mode === "active") {
    return `Active map layers legend: ${label}`;
  }
  return label;
}

/**
 * Renders choropleth and transit layer legend entries for a map domain.
 * @remarks Must be rendered inside a `DomainProvider`.
 * @example
 * <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
 *   <Legend mode="active" visibleLayerIds={["townships"]} />
 * </DomainProvider>
 */
export function Legend({
  mode = "all",
  visibleLayerIds = [],
  compact = false,
}: LegendProps) {
  const { getLayers } = useDomain();
  const layers = getLayers();
  const isActiveMode = mode === "active";
  const choroplethSections = choroplethLegends(
    layers,
    isActiveMode ? visibleLayerIds : undefined,
  );
  const transitEntries = getTransitEntries(
    layers,
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
            aria-label={getLegendAriaLabel(mode, layer.label)}
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
            aria-label={getLegendAriaLabel(mode, "Transit route colours")}
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
