import type { LayerId } from "@buffer-zones/shared";
import { getLayerDefinitions } from "../../layers/registry";
import styles from "./LayerToggles.module.css";

interface LayerTogglesProps {
  visibleLayerIds: LayerId[];
  onToggle: (id: LayerId) => void;
}

export function LayerToggles({ visibleLayerIds, onToggle }: LayerTogglesProps) {
  const layers = getLayerDefinitions();
  const accessLayers = layers.filter(
    (layer) => layer.layerType === "choropleth",
  );
  const transitLayers = layers.filter(
    (layer) => layer.layerType !== "choropleth",
  );

  function renderLayer(layer: (typeof layers)[number]) {
    return (
      <li key={layer.id}>
        <label
          className={styles.row}
          data-unavailable={layer.available ? undefined : "true"}
        >
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={visibleLayerIds.includes(layer.id)}
            disabled={!layer.available}
            onChange={() => onToggle(layer.id)}
          />
          <span className={styles.label}>{layer.label}</span>
          {layer.available ? null : (
            <span className={styles.badge}>Not yet available</span>
          )}
        </label>
      </li>
    );
  }

  return (
    <div className={styles.groups}>
      <section className={styles.group} aria-label="Accessibility overlays">
        <h3 className={styles.groupTitle}>Accessibility overlays</h3>
        <p className={styles.groupHint}>
          Only one overlay can be active at a time.
        </p>
        <ul className={styles.list}>{accessLayers.map(renderLayer)}</ul>
      </section>
      <div className={styles.divider} aria-hidden="true" />
      <section className={styles.group} aria-label="Transit networks">
        <h3 className={styles.groupTitle}>Transit networks</h3>
        <ul className={styles.list}>{transitLayers.map(renderLayer)}</ul>
      </section>
    </div>
  );
}
