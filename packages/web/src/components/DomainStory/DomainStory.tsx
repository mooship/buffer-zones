import type { DomainStory as DomainStoryContent } from "@stratum/core";
import styles from "./DomainStory.module.css";

interface DomainStoryProps {
  story: DomainStoryContent;
}

/**
 * Renders a domain's narrative "why this map exists" body copy.
 * @remarks Only renders `story.body` — the caller renders `story.title` as
 *   its own section heading, reusing the shared `.sectionTitle` style rather
 *   than duplicating it here, the same way the Layers view's "Layers"
 *   heading is rendered outside `LayerToggles`.
 */
export function DomainStory({ story }: DomainStoryProps) {
  return <p className={styles.body}>{story.body}</p>;
}
