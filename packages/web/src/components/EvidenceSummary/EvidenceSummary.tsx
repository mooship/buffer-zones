import styles from "./EvidenceSummary.module.css";

interface EvidenceSummaryProps {
  /** Total selected job centres across all metros, interpolated into the methodology copy. */
  jobCenterCount: number;
  /** Region-specific framing copy shown above the fixed methodology/limitations text. */
  contextText: string;
}

/**
 * Renders the "story" panel's fixed methodology and limitations copy:
 * what the modelled car-time metric does and doesn't measure, how included
 * areas were classified, and a link to further historical context.
 */
export function EvidenceSummary({
  jobCenterCount,
  contextText,
}: EvidenceSummaryProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.context}>{contextText}</p>
      <div className={styles.limitation}>
        <strong>Car time is only a baseline proxy.</strong>
        <span>
          It shows the fastest modelled drive to the nearest of {jobCenterCount}{" "}
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
        Transit is not mapped evenly across metros.
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
