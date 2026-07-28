import type { TownshipProperties } from "@buffer-zones/shared";
import { formatCommuteTime } from "../../utils/formatCommuteTime";
import styles from "./TownshipPopup.module.css";

interface TownshipPopupProps {
  properties: TownshipProperties;
}

export function TownshipPopup({ properties }: TownshipPopupProps) {
  return (
    <div className={styles.popup}>
      <h2 className={styles.name}>{properties.name}</h2>
      <dl className={styles.rows}>
        <dt>Commute</dt>
        <dd className={styles.value}>
          {formatCommuteTime(properties.commuteMinutes)}
        </dd>
        <dt>Nearest job centre</dt>
        <dd>{properties.nearestJobCenter}</dd>
        {properties.population !== undefined && (
          <>
            <dt>Population</dt>
            <dd className={styles.value}>
              {properties.population.toLocaleString("en-ZA")}
            </dd>
          </>
        )}
        {properties.distanceKm !== null && (
          <>
            <dt>Distance</dt>
            <dd className={styles.value}>
              {properties.distanceKm.toFixed(1)} km
            </dd>
          </>
        )}
        {properties.unemploymentRatePercent !== null && (
          <>
            <dt>Unemployment</dt>
            <dd className={styles.value}>
              {properties.unemploymentRatePercent.toFixed(1)}%
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
