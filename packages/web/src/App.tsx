import type { TownshipFeature } from "@buffer-zones/shared";
import clsx from "clsx";
import type { Feature } from "geojson";
import { Layers, Minus, Plus, X } from "lucide-react";
import {
  type KeyboardEvent,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./App.module.css";
import { EvidenceSummary } from "./components/EvidenceSummary/EvidenceSummary";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { Legend } from "./components/Legend/Legend";
import { SettingsMenu } from "./components/SettingsMenu/SettingsMenu";
import { TownshipBrowser } from "./components/TownshipBrowser/TownshipBrowser";
import {
  APP_NAME,
  APP_TAGLINE,
  DATA_AS_OF,
  DATA_SOURCES,
  REPOSITORY_URL,
} from "./constants/metadata";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { fetchFeatureCollection } from "./data/fetchFeatureCollection";
import {
  setThemePreference,
  useThemePreference,
} from "./hooks/useThemePreference";
import { type PanelView, useMapUiStore } from "./stores/useMapUiStore";

const repository = createTownshipDataRepository(
  "/data/townships.display.v1.geojson",
);

const MapView = lazy(async () => {
  const module = await import("./components/MapView/MapView");
  return { default: module.MapView };
});

const PANEL_VIEWS = ["story", "places", "layers"] as const;

const PANEL_LABELS: Record<PanelView, string> = {
  story: "The pattern",
  places: "Browse places",
  layers: "Map layers",
};

export function App() {
  const [townships, setTownships] = useState<TownshipFeature[]>([]);
  const [townshipAreas, setTownshipAreas] = useState<Feature[]>([]);
  const [dataError, setDataError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const visibleLayerIds = useMapUiStore((state) => state.visibleLayerIds);
  const basemap = useMapUiStore((state) => state.basemap);
  const panelOpen = useMapUiStore((state) => state.panelOpen);
  const panelView = useMapUiStore((state) => state.panelView);
  const titleExpanded = useMapUiStore((state) => state.titleExpanded);
  const selectedTownshipId = useMapUiStore((state) => state.selectedTownshipId);
  const toggleLayer = useMapUiStore((state) => state.toggleLayer);
  const setBasemap = useMapUiStore((state) => state.setBasemap);
  const setPanelOpen = useMapUiStore((state) => state.setPanelOpen);
  const setPanelView = useMapUiStore((state) => state.setPanelView);
  const setTitleExpanded = useMapUiStore((state) => state.setTitleExpanded);
  const setSelectedTownshipId = useMapUiStore(
    (state) => state.setSelectedTownshipId,
  );
  const themePreference = useThemePreference();
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    if (loadAttempt > 0) {
      setTownships([]);
      setTownshipAreas([]);
    }
    Promise.all([
      repository.getTownships(),
      fetchFeatureCollection("/data/township-areas.display.v1.geojson"),
    ])
      .then(([features, areas]) => {
        if (!cancelled) {
          setTownships(features);
          setTownshipAreas(areas.features);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  function handlePanelToggle() {
    if (panelOpen) {
      setPanelOpen(false);
      requestAnimationFrame(() => panelTriggerRef.current?.focus());
      return;
    }
    setPanelOpen(true);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = PANEL_VIEWS.indexOf(panelView);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % PANEL_VIEWS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + PANEL_VIEWS.length) % PANEL_VIEWS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PANEL_VIEWS.length - 1;
    }
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    const nextView = PANEL_VIEWS[nextIndex];
    if (!nextView) {
      return;
    }
    setPanelView(nextView);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#map-information">
        Skip to map information
      </a>

      <main id="map-information" tabIndex={-1}>
        <Suspense
          fallback={<output className={styles.mapLoading}>Loading map</output>}
        >
          <MapView
            townships={townships}
            townshipAreas={townshipAreas}
            visibleLayerIds={visibleLayerIds}
            basemap={basemap}
            selectedTownshipId={selectedTownshipId}
            onTownshipSelect={setSelectedTownshipId}
          />
        </Suspense>
        {dataError ? (
          <div className={styles.dataError} role="alert">
            <p>Map data could not be loaded.</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}
      </main>

      <header
        className={clsx(
          styles.titleBlock,
          styles.ticked,
          !titleExpanded && styles.titleBlockMinimised,
        )}
      >
        <h1 className={styles.title}>{APP_NAME}</h1>
        <button
          type="button"
          className={styles.titleToggle}
          aria-expanded={titleExpanded}
          aria-controls="title-context"
          aria-label={
            titleExpanded ? "Minimise introduction" : "Expand introduction"
          }
          onClick={() => setTitleExpanded(!titleExpanded)}
        >
          {titleExpanded ? (
            <Minus aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
        </button>
        <div id="title-context" hidden={!titleExpanded}>
          <p className={styles.eyebrow}>Tshwane spatial access atlas</p>
          <p className={styles.tagline}>{APP_TAGLINE}</p>
          <p className={styles.framing}>
            Townships were planned apart from work and services. This baseline
            makes the distance visible.
          </p>
          <p className={styles.stamp}>Data as of {DATA_AS_OF}</p>
        </div>
      </header>

      <button
        type="button"
        ref={panelTriggerRef}
        className={styles.panelTrigger}
        aria-expanded={panelOpen}
        aria-controls="map-controls"
        onClick={handlePanelToggle}
      >
        {panelOpen ? <X aria-hidden="true" /> : <Layers aria-hidden="true" />}
        {panelOpen ? "Close" : "Explore"}
      </button>

      <aside
        id="map-controls"
        className={clsx(styles.panel, styles.ticked)}
        hidden={!panelOpen}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.panelTabs} role="tablist" aria-label="Map panel">
          {PANEL_VIEWS.map((view, index) => (
            <button
              key={view}
              type="button"
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`panel-tab-${view}`}
              role="tab"
              tabIndex={panelView === view ? 0 : -1}
              aria-selected={panelView === view}
              aria-controls={`panel-view-${view}`}
              className={styles.panelTab}
              onClick={() => setPanelView(view)}
              onKeyDown={handleTabKeyDown}
            >
              {PANEL_LABELS[view]}
            </button>
          ))}
        </div>

        <div
          id={`panel-view-${panelView}`}
          role="tabpanel"
          aria-labelledby={`panel-tab-${panelView}`}
          className={styles.panelViewport}
        >
          {panelView === "story" ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Why this map exists</h2>
              <EvidenceSummary />
              <details className={styles.panelSources}>
                <summary>Data sources and method</summary>
                <div className={styles.panelSourceList}>
                  {DATA_SOURCES.map((source) => (
                    <span key={source}>{source}</span>
                  ))}
                  <a
                    className={styles.panelSourceLink}
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source code: mooship/buffer-zones
                  </a>
                </div>
              </details>
            </section>
          ) : null}
          {panelView === "places" ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Included areas</h2>
              <TownshipBrowser
                townships={townships}
                selectedTownshipId={selectedTownshipId}
                onSelect={(township) =>
                  setSelectedTownshipId(township.properties.id)
                }
              />
            </section>
          ) : null}
          {panelView === "layers" ? (
            <div className={styles.panelContent}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Map legend</h2>
                <Legend />
              </section>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Layers</h2>
                <LayerToggles
                  visibleLayerIds={visibleLayerIds}
                  onToggle={toggleLayer}
                />
              </section>
            </div>
          ) : null}
        </div>
      </aside>

      <div className={styles.settingsControl}>
        <SettingsMenu
          basemap={basemap}
          onBasemapChange={setBasemap}
          themePreference={themePreference}
          onThemePreferenceChange={setThemePreference}
        />
      </div>
    </div>
  );
}
