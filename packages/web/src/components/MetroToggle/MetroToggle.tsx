import { METROS, type MetroId } from "@buffer-zones/shared";
import styles from "./MetroToggle.module.css";

interface MetroToggleProps {
  metroId: MetroId;
  onChange: (metroId: MetroId) => void;
}

export function MetroToggle({ metroId, onChange }: MetroToggleProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Metro</legend>
      {METROS.map((metro) => (
        <button
          key={metro.id}
          type="button"
          className={styles.option}
          aria-pressed={metro.id === metroId}
          aria-label={`${metro.shortName} metro`}
          onClick={() => onChange(metro.id)}
        >
          {metro.shortName}
        </button>
      ))}
    </fieldset>
  );
}
