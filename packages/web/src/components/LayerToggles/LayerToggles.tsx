import { Fragment } from "react";
import { getLayer, getLayerGroups } from "../../layers/registry";
import styles from "./LayerToggles.module.css";

interface LayerTogglesProps {
  visibleLayerIds: string[];
  onToggle: (id: string) => void;
}

export function LayerToggles({ visibleLayerIds, onToggle }: LayerTogglesProps) {
  const groups = getLayerGroups();

  function renderLayer(layerId: string) {
    const layer = getLayer(layerId);
    if (!layer) {
      return null;
    }
    const layerTestId = `layer-toggle-${layer.id}`;
    return (
      <li key={layer.id}>
        <label
          className={styles.row}
          data-unavailable={layer.available ? undefined : "true"}
          data-testid={`${layerTestId}-row`}
          data-e2e={`${layerTestId}-row`}
        >
          <input
            type="checkbox"
            className={styles.checkbox}
            data-testid={layerTestId}
            data-e2e={layerTestId}
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
      {groups.map((group, index) => (
        <Fragment key={group.id}>
          {index > 0 ? (
            <div className={styles.divider} aria-hidden="true" />
          ) : null}
          <section className={styles.group} aria-label={group.title}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            {group.description ? (
              <p className={styles.groupHint}>{group.description}</p>
            ) : null}
            <ul className={styles.list}>{group.layerIds.map(renderLayer)}</ul>
          </section>
        </Fragment>
      ))}
    </div>
  );
}
