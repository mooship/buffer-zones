import type { LayerId } from "@buffer-zones/shared";
import { LAYER_REGISTRY } from "../../layers/registry";
import styles from "./LayerToggles.module.css";

interface LayerTogglesProps {
  visibleLayerIds: LayerId[];
  onToggle: (id: LayerId) => void;
}

export function LayerToggles({ visibleLayerIds, onToggle }: LayerTogglesProps) {
  return (
    <ul className={styles.list}>
      {LAYER_REGISTRY.map((layer) => (
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
      ))}
    </ul>
  );
}
