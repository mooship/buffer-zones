import type { DomainStory as DomainStoryContent } from "@stratum/core";
import styles from "./DomainStory.module.css";

interface DomainStoryProps {
  story: DomainStoryContent;
}

/**
 * Renders a domain's narrative "why this map exists" copy.
 * @remarks Content is entirely sourced from the domain's `DomainConfig`
 *   (via `story`) rather than hardcoded here, so this component renders the
 *   same way for any domain that supplies one.
 */
export function DomainStory({ story }: DomainStoryProps) {
  return (
    <div className={styles.story}>
      <h2 className={styles.title}>{story.title}</h2>
      <p className={styles.body}>{story.body}</p>
    </div>
  );
}
