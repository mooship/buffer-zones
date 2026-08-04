import { Fragment } from "react";
import { getLayer, getLayerGroups } from "../../layers/registry";
import styles from "./LayerToggles.module.css";

interface LayerTogglesProps {
  visibleLayerIds: string[];
  onToggle: (id: string) => void;
  /** Ids of layers whose data failed to load, shown with a retry hint badge. */
  failedLayerIds?: string[];
}

/**
 * Renders every layer group from the domain registry as a checkbox list,
 * grouped under its title/description. Each layer shows its own
 * `description`, when it has one, beneath its label. An unavailable layer's
 * checkbox is disabled with a "Not yet available" badge; a failed-to-load
 * visible layer shows a "Failed to load" badge instead.
 */
export function LayerToggles({
  visibleLayerIds,
  onToggle,
  failedLayerIds = [],
}: LayerTogglesProps) {
  const groups = getLayerGroups();

  function renderLayer(layerId: string) {
    const layer = getLayer(layerId);
    /* v8 ignore next 3 -- unreachable: every layer group's layerIds is drawn from the same registry, so getLayer always finds a match */
    if (!layer) {
      return null;
    }
    const layerTestId = `layer-toggle-${layer.id}`;
    const labelId = `${layerTestId}-label`;
    const descriptionId = `${layerTestId}-description`;
    const failed = failedLayerIds.includes(layer.id);
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
            aria-labelledby={labelId}
            aria-describedby={layer.description ? descriptionId : undefined}
          />
          <span className={styles.label} id={labelId}>
            {layer.label}
          </span>
          {layer.description ? (
            <span
              className={styles.description}
              id={descriptionId}
              data-testid={descriptionId}
              data-e2e={descriptionId}
            >
              {layer.description}
            </span>
          ) : null}
          {layer.available ? null : (
            <span className={styles.badge}>Not yet available</span>
          )}
          {layer.available && failed ? (
            <span
              className={styles.badgeError}
              role="status"
              data-testid={`${layerTestId}-error`}
              data-e2e={`${layerTestId}-error`}
            >
              Failed to load — toggle off and on to retry
            </span>
          ) : null}
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
