import styles from "./EvidenceSummary.module.css";

interface EvidenceSummaryProps {
  jobCenterCount: number;
}

export function EvidenceSummary({ jobCenterCount }: EvidenceSummaryProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.context}>
        Apartheid law controlled where Black, Coloured and Indian people could
        live. Black townships were deliberately separated from economic centres;
        those distances still shape access to work.
      </p>
      <div className={styles.limitation}>
        <strong>Car time is only a baseline proxy.</strong>
        <span>
          It shows the fastest modeled drive to the nearest of {jobCenterCount}{" "}
          selected job centres. It does not measure walking, waiting, transfers,
          service frequency or whether a household has access to a car.
        </span>
      </div>
      <p className={styles.method}>
        The route overlays show where formal transit runs, not how reliably or
        quickly people can reach work. The next primary measure is jobs
        reachable within 45, 60 and 90 minutes by public transport, including
        walking, waiting and transfers.
      </p>
      <p className={styles.method}>
        Included township and settlement areas are a documented working
        classification built from Census 2011 main places and named sub-places,
        not an official Stats SA township category.
      </p>
      <p className={styles.method}>
        Transit is not mapped evenly across metros. Ekurhuleni is matched only
        against the Gauteng-wide rail and Gautrain bus networks, because
        OpenStreetMap carries no route geometry for its municipal bus or BRT
        services. Its distances to transit therefore overstate the gap compared
        with Tshwane and Johannesburg, which reflects a mapping gap rather than
        a measured difference in service.
      </p>
      <a
        className={styles.source}
        href="https://sahistory.org.za/ref/A-0098760"
        target="_blank"
        rel="noreferrer"
      >
        Historical context: South African History Online
      </a>
    </div>
  );
}
