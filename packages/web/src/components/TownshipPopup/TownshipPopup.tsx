import type { TownshipProperties } from "@stratum/app";
import { formatCommuteTime } from "../../utils/formatCommuteTime";
import styles from "./TownshipPopup.module.css";

interface TownshipPopupProps {
  properties: TownshipProperties;
}

export function TownshipPopup({ properties }: TownshipPopupProps) {
  return (
    <div
      className={styles.popup}
      data-testid="township-popup"
      data-e2e="township-popup"
    >
      <h2 className={styles.name}>{properties.name}</h2>
      <dl className={styles.rows}>
        <dt>Modelled car time</dt>
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
        {properties.nearestTransitKm !== null && (
          <>
            <dt>Distance to nearest transit</dt>
            <dd className={styles.value}>
              {properties.nearestTransitKm.toFixed(1)} km
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
