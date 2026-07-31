import { Settings, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
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

    function handleKeyDown(event: KeyboardEvent) {
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

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSearchError("Enter at least two characters to search.");
      setResults([]);
      return;
    }

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;

    setSearching(true);
    setSearchError(null);

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
  }

  function handleResultSelect(result: LocationSearchResult) {
    onLocationSelect(result);
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
          <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
            <label
              className={styles.searchLabel}
              htmlFor="settings-location-search"
            >
              Find any place
            </label>
            <div className={styles.searchRow}>
              <input
                id="settings-location-search"
                data-testid="settings-location-search-input"
                data-e2e="settings-location-search-input"
                className={styles.searchInput}
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search locations"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button
                type="submit"
                className={styles.searchButton}
                data-testid="settings-location-search-submit"
                data-e2e="settings-location-search-submit"
                disabled={searching}
              >
                {searching ? "Searching" : "Search"}
              </button>
            </div>
          </form>
          {searchError ? (
            <output className={styles.searchStatus}>{searchError}</output>
          ) : null}
          {results.length > 0 ? (
            <ul
              className={styles.searchResults}
              data-testid="settings-location-search-results"
              data-e2e="settings-location-search-results"
            >
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className={styles.searchResultButton}
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
