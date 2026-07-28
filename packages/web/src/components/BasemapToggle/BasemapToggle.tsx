import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import styles from "./BasemapToggle.module.css";

interface BasemapToggleProps {
  basemap: Basemap;
  onChange: (basemap: Basemap) => void;
}

const BASEMAP_IDS = Object.keys(BASEMAPS) as Basemap[];

export function BasemapToggle({ basemap, onChange }: BasemapToggleProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Basemap</legend>
      {BASEMAP_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={styles.option}
          aria-pressed={id === basemap}
          onClick={() => onChange(id)}
        >
          {BASEMAPS[id].label}
        </button>
      ))}
    </fieldset>
  );
}
