import {
  type KeyboardEvent as ReactKeyboardEvent,
  useMemo,
  useState,
} from "react";
import styles from "./SelectableFeatureSearch.module.css";

/** One selectable feature's search-index entry: its id plus accessible label. */
export interface SelectableFeatureSearchEntry {
  id: string;
  label: string;
}

interface SelectableFeatureSearchProps {
  /** The full set of currently-selectable features to search across. */
  features: SelectableFeatureSearchEntry[];
  /** The currently selected feature's id, if any, announced via a live region. */
  selectedFeatureId: string | null;
  /** Called with a feature's id when it's chosen via click, Enter, or Space. */
  onSelect?: (featureId: string) => void;
  /**
   * Accessible label, visible label text, and input placeholder, all sharing
   * one string. Defaults to a domain-agnostic phrasing since this component
   * lives in `@stratum/map` and has no knowledge of what a caller's
   * selectable features represent (townships, stations, or anything else).
   */
  label?: string;
}

const DEFAULT_LABEL = "Search by name";
const MIN_QUERY_LENGTH = 2;
const MAX_SEARCH_RESULTS = 8;

/**
 * A keyboard-first, name-search alternative to tabbing through every
 * selectable map feature directly.
 * @remarks Replaces per-feature `tabindex` (which required forcing an SVG
 *   renderer and mounting one DOM node per feature — untenable for datasets
 *   in the thousands) with a bounded, always-cheap combobox: results are
 *   capped at `MAX_SEARCH_RESULTS` regardless of how many features match, so
 *   this never mounts more than a handful of DOM nodes at once. Deliberately
 *   a search box, not a browsable list of every feature — the app previously
 *   removed a full feature-browsing UI, and this exists purely to restore
 *   keyboard/assistive-technology parity with mouse click-to-select, not to
 *   reintroduce browsing. Visually hidden until focused (see
 *   `.revealWrapper` in the stylesheet) so it adds no visible chrome for
 *   mouse users; a persistent live region announces the selected feature's
 *   label for assistive technology regardless of whether this component
 *   currently has focus, replacing the `aria-current` marking that also
 *   required a real per-feature DOM element.
 */
export function SelectableFeatureSearch({
  features,
  selectedFeatureId,
  onSelect,
  label = DEFAULT_LABEL,
}: SelectableFeatureSearchProps) {
  const [query, setQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(-1);

  const trimmedQuery = query.trim();
  // Scanned on demand rather than indexed up front. `features` can run to
  // thousands of entries and arrives while the map is still becoming
  // interactive, so building a lowercased copy and an id -> label map at
  // that moment spends main-thread time on an index nobody has asked for
  // yet; a linear scan per keystroke over a few thousand short strings is
  // imperceptible by comparison, and only happens once somebody types.
  const matches = useMemo(() => {
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return [];
    }
    const lowerQuery = trimmedQuery.toLowerCase();
    return features.filter((feature) =>
      feature.label.toLowerCase().includes(lowerQuery),
    );
  }, [features, trimmedQuery]);
  const results = matches.slice(0, MAX_SEARCH_RESULTS);
  const truncatedCount = matches.length - results.length;
  const hasResults = results.length > 0;
  const activeResult =
    activeResultIndex >= 0 && activeResultIndex < results.length
      ? results[activeResultIndex]
      : null;
  const selectedLabel = useMemo(
    () =>
      selectedFeatureId
        ? (features.find((feature) => feature.id === selectedFeatureId)
            ?.label ?? null)
        : null,
    [features, selectedFeatureId],
  );

  function resetQuery() {
    setQuery("");
    setActiveResultIndex(-1);
  }

  function selectFeature(featureId: string) {
    onSelect?.(featureId);
    resetQuery();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      setActiveResultIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      setActiveResultIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      if (activeResultIndex < 0 || activeResultIndex >= results.length) {
        return;
      }
      event.preventDefault();
      const selected = results[activeResultIndex];
      /* v8 ignore next 3 -- unreachable: activeResultIndex is already bounds-checked above */
      if (selected) {
        selectFeature(selected.id);
      }
      return;
    }

    if (event.key === "Escape") {
      resetQuery();
    }
  }

  return (
    <section
      className={styles.root}
      aria-label={label}
      data-testid="selectable-feature-search"
      data-e2e="selectable-feature-search"
    >
      <output aria-live="polite" className={styles.visuallyHidden}>
        {selectedLabel ? `${selectedLabel} selected` : ""}
      </output>
      <div className={styles.revealWrapper}>
        <label className={styles.label} htmlFor="map-feature-search">
          {label}
        </label>
        <input
          id="map-feature-search"
          data-testid="selectable-feature-search-input"
          data-e2e="selectable-feature-search-input"
          className={styles.input}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={hasResults}
          aria-controls="selectable-feature-search-results"
          aria-activedescendant={
            activeResult
              ? `selectable-feature-search-option-${activeResult.id}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          placeholder={label}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveResultIndex(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        {truncatedCount > 0 ? (
          <output className={styles.status}>
            {truncatedCount} more match — narrow your search
          </output>
        ) : null}
        {hasResults ? (
          <ul
            id="selectable-feature-search-results"
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: role="listbox" on <ul> is the standard WAI-ARIA combobox pattern
            role="listbox"
            className={styles.results}
            data-testid="selectable-feature-search-results"
            data-e2e="selectable-feature-search-results"
          >
            {results.map((result, index) => (
              <li key={result.id} role="presentation">
                <button
                  id={`selectable-feature-search-option-${result.id}`}
                  type="button"
                  role="option"
                  aria-selected={activeResultIndex === index}
                  className={styles.resultButton}
                  data-active={activeResultIndex === index ? "true" : "false"}
                  onClick={() => selectFeature(result.id)}
                >
                  {result.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
