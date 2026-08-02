import { Search } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useState,
} from "react";
import {
  type GeocoderProvider,
  type LocationSearchResult,
  nominatimGeocoderProvider,
} from "../../data/locationSearch";
import { useAbortController } from "../../hooks/useAbortController";
import styles from "./LocationSearchControl.module.css";

interface LocationSearchControlProps {
  onLocationSelect: (location: LocationSearchResult) => void;
  /** Input placeholder text. Defaults to `"Search town, suburb or station"`. */
  placeholder?: string;
  /** Geocoder backend used for search. Defaults to OpenStreetMap Nominatim. */
  provider?: GeocoderProvider;
}

const MIN_SEARCH_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 260;
const DEFAULT_PLACEHOLDER = "Search town, suburb or station";

/**
 * A debounced, keyboard-navigable place search box backed by Nominatim.
 * @remarks Calls `onLocationSelect` when the user picks a result via click,
 *   Enter, or keyboard arrow navigation followed by Enter.
 */
export function LocationSearchControl({
  onLocationSelect,
  placeholder = DEFAULT_PLACEHOLDER,
  provider = nominatimGeocoderProvider,
}: LocationSearchControlProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const { next, abort } = useAbortController();

  // biome-ignore lint/correctness/useExhaustiveDependencies: provider intentionally omitted -- it's a public prop with no stability guarantee, so including it could re-fire this effect on every render for callers that don't memoize it
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      setActiveResultIndex(-1);
      abort();
      return;
    }

    const signal = next();

    const debounceTimer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      setActiveResultIndex(-1);

      try {
        const nextResults = await provider.search(trimmedQuery, signal);
        setResults(nextResults);

        if (nextResults.length === 0) {
          setSearchError("No places matched that search.");
        }
      } catch {
        if (signal.aborted) {
          return;
        }
        setResults([]);
        setSearchError("Search is unavailable right now. Please try again.");
      } finally {
        if (!signal.aborted) {
          setSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
      abort();
    };
  }, [query, next, abort]);

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
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
      if (selected) {
        handleResultSelect(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      setResults([]);
      setSearchError(null);
      setActiveResultIndex(-1);
    }
  }

  function handleResultSelect(result: LocationSearchResult) {
    onLocationSelect(result);
    setQuery(result.label);
    setResults([]);
    setSearchError(null);
    setActiveResultIndex(-1);
  }

  const activeResult =
    activeResultIndex >= 0 && activeResultIndex < results.length
      ? results[activeResultIndex]
      : null;
  const hasResults = results.length > 0;

  return (
    <section
      className={styles.root}
      aria-label="Location search"
      data-testid="location-search"
      data-e2e="location-search"
    >
      <label className={styles.label} htmlFor="map-location-search">
        <Search aria-hidden="true" />
        Search place
      </label>
      <input
        id="map-location-search"
        data-testid="location-search-input"
        data-e2e="location-search-input"
        className={styles.input}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={hasResults}
        aria-controls="location-search-results"
        aria-activedescendant={
          activeResult ? `location-search-option-${activeResult.id}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSearchError(null);
          setActiveResultIndex(-1);
        }}
        onKeyDown={handleInputKeyDown}
      />
      {query.trim().length >= MIN_SEARCH_QUERY_LENGTH && searching ? (
        <output className={styles.status}>Searching places...</output>
      ) : null}
      {searchError ? (
        <output className={styles.status}>{searchError}</output>
      ) : null}
      {results.length > 0 ? (
        <ul
          id="location-search-results"
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: role="listbox" on <ul> is the standard WAI-ARIA combobox pattern
          role="listbox"
          className={styles.results}
          data-testid="location-search-results"
          data-e2e="location-search-results"
        >
          {results.map((result, index) => (
            <li key={result.id} role="presentation">
              <button
                id={`location-search-option-${result.id}`}
                type="button"
                role="option"
                aria-selected={activeResultIndex === index}
                className={styles.resultButton}
                data-active={activeResultIndex === index ? "true" : "false"}
                onClick={() => handleResultSelect(result)}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
