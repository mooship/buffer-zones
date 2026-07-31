import { Settings, X } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import {
  type LocationSearchResult,
  fetchLocationSearchResults,
} from "../../data/locationSearch";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { BasemapToggle } from "../BasemapToggle/BasemapToggle";
import { IconButton } from "../IconButton/IconButton";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./SettingsMenu.module.css";

interface SettingsMenuProps {
  basemap: Basemap;
  onBasemapChange: (basemap: Basemap) => void;
  themePreference: ThemePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onLocationSelect: (location: LocationSearchResult) => void;
}

const MIN_SEARCH_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 260;

export function SettingsMenu({
  basemap,
  onBasemapChange,
  themePreference,
  onThemePreferenceChange,
  onLocationSelect,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      setActiveResultIndex(-1);
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      setActiveResultIndex(-1);
      return;
    }

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    const debounceTimer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      setActiveResultIndex(-1);

      try {
        const nextResults = await fetchLocationSearchResults(
          trimmedQuery,
          controller.signal,
        );
        setResults(nextResults);

        if (nextResults.length === 0) {
          setSearchError("No places matched that search.");
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setResults([]);
        setSearchError("Search is unavailable right now. Please try again.");
      } finally {
        if (searchControllerRef.current === controller) {
          setSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [open, query]);

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
    setOpen(false);
  }

  return (
    <div
      className={styles.container}
      ref={containerRef}
      data-testid="settings-menu-root"
      data-e2e="settings-menu-root"
    >
      <IconButton
        ref={triggerRef}
        className={styles.trigger}
        data-testid="settings-menu-trigger"
        data-e2e="settings-menu-trigger"
        aria-expanded={open}
        aria-controls="map-settings-menu"
        label={open ? "Close map settings" : "Map settings"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Settings aria-hidden="true" />}
      </IconButton>
      {open ? (
        <div
          id="map-settings-menu"
          className={styles.menu}
          role="menu"
          data-testid="settings-menu-content"
          data-e2e="settings-menu-content"
        >
          <BasemapToggle basemap={basemap} onChange={onBasemapChange} />
          <p
            className={styles.basemapHint}
            data-testid="settings-basemap-hint"
            aria-live="polite"
          >
            {BASEMAPS[basemap].description}
          </p>
          <div className={styles.searchForm}>
            <label
              className={styles.searchLabel}
              htmlFor="settings-location-search"
            >
              Find any place
            </label>
            <input
              id="settings-location-search"
              data-testid="settings-location-search-input"
              data-e2e="settings-location-search-input"
              className={styles.searchInput}
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Start typing a place name"
              aria-expanded={results.length > 0}
              aria-controls="settings-location-search-results"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchError(null);
                setActiveResultIndex(-1);
              }}
              onKeyDown={handleInputKeyDown}
            />
          </div>
          {query.trim().length >= MIN_SEARCH_QUERY_LENGTH && searching ? (
            <output className={styles.searchStatus}>Searching places…</output>
          ) : null}
          {searchError ? (
            <output className={styles.searchStatus}>{searchError}</output>
          ) : null}
          {results.length > 0 ? (
            <ul
              id="settings-location-search-results"
              className={styles.searchResults}
              data-testid="settings-location-search-results"
              data-e2e="settings-location-search-results"
            >
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    type="button"
                    aria-selected={activeResultIndex === index}
                    className={styles.searchResultButton}
                    data-active={activeResultIndex === index ? "true" : "false"}
                    onClick={() => handleResultSelect(result)}
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <ThemeToggle
            preference={themePreference}
            onChange={onThemePreferenceChange}
          />
        </div>
      ) : null}
    </div>
  );
}
