import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import styles from "./BasemapToggle.module.css";

interface BasemapToggleProps {
  basemap: Basemap;
  onChange: (basemap: Basemap) => void;
}

const BASEMAP_IDS = Object.keys(BASEMAPS) as Basemap[];

export function BasemapToggle({ basemap, onChange }: BasemapToggleProps) {
  return (
    <fieldset
      className={styles.group}
      data-testid="basemap-toggle"
      data-e2e="basemap-toggle"
    >
      <legend className={styles.legend}>Basemap</legend>
      {BASEMAP_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={styles.option}
          data-testid={`basemap-option-${id}`}
          data-e2e={`basemap-option-${id}`}
          aria-pressed={id === basemap}
          aria-label={`${BASEMAPS[id].label} basemap`}
          onClick={() => onChange(id)}
        >
          {BASEMAPS[id].label}
        </button>
      ))}
    </fieldset>
  );
}
