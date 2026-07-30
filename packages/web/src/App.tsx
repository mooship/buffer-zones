import { METROS, type TownshipFeature } from "@buffer-zones/shared";
import clsx from "clsx";
import type { Feature } from "geojson";
import { Layers, Minus, Plus, X } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./App.module.css";
import { ControlButton } from "./components/ControlButton/ControlButton";
import { EvidenceSummary } from "./components/EvidenceSummary/EvidenceSummary";
import { IconButton } from "./components/IconButton/IconButton";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { MobileLegend } from "./components/MobileLegend/MobileLegend";
import { SettingsMenu } from "./components/SettingsMenu/SettingsMenu";
import { TownshipBrowser } from "./components/TownshipBrowser/TownshipBrowser";
import {
  APP_NAME,
  DATA_AS_OF,
  DATA_SOURCES,
  REPOSITORY_URL,
  getAppTagline,
} from "./constants/metadata";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { fetchFeatureCollection } from "./data/fetchFeatureCollection";
import {
  setThemePreference,
  useThemePreference,
} from "./hooks/useThemePreference";
import { type PanelView, useMapUiStore } from "./stores/useMapUiStore";

const MapView = lazy(async () => {
  const module = await import("./components/MapView/MapView");
  return { default: module.MapView };
});

const PANEL_VIEWS = ["story", "places", "layers"] as const;
const MOBILE_BREAKPOINT_PX = 768;
const SHEET_DRAG_THRESHOLD_PX = 36;
const SHEET_DRAG_PREVIEW_LIMIT_PX = 96;

const PANEL_LABELS: Record<PanelView, string> = {
  story: "The pattern",
  places: "Browse places",
  layers: "Map layers",
};

const NATIONAL_JOB_CENTER_COUNT = METROS.reduce(
  (total, metro) => total + metro.jobCenterCount,
  0,
);

export function App() {
  const [townships, setTownships] = useState<TownshipFeature[]>([]);
  const [townshipAreas, setTownshipAreas] = useState<Feature[]>([]);
  const [dataError, setDataError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [mobileSheetDragging, setMobileSheetDragging] = useState(false);
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
  const suppressNextHandleClickRef = useRef(false);
  const activeSheetPointerIdRef = useRef<number | null>(null);
  const pendingSheetDragOffsetRef = useRef(0);
  const sheetDragFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    setTownships([]);
    setTownshipAreas([]);
    const cacheBust = loadAttempt > 0 ? `?retry=${loadAttempt}` : "";
    const repository = createTownshipDataRepository(
      `/data/national/townships.display.v1.geojson${cacheBust}`,
    );
    Promise.all([
      repository.getTownships(),
      fetchFeatureCollection(
        `/data/national/township-areas.display.v1.geojson${cacheBust}`,
      ),
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

  useEffect(() => {
    if (!panelOpen) {
      setMobilePanelExpanded(false);
      setMobileSheetDragging(false);
      setMobileSheetDragOffset(0);
      activeSheetPointerIdRef.current = null;
    }
  }, [panelOpen]);

  useEffect(() => {
    return () => {
      if (sheetDragFrameRef.current !== null) {
        cancelAnimationFrame(sheetDragFrameRef.current);
      }
    };
  }, []);

  const mobileSheetDragDirection =
    mobileSheetDragOffset < -4
      ? "up"
      : mobileSheetDragOffset > 4
        ? "down"
        : "none";
  const mobilePanelDragStyle = {
    "--panel-drag-offset": `${mobileSheetDragOffset}px`,
  } as CSSProperties;

  function scheduleSheetDragOffset(nextOffset: number) {
    pendingSheetDragOffsetRef.current = nextOffset;
    if (sheetDragFrameRef.current !== null) {
      return;
    }
    sheetDragFrameRef.current = requestAnimationFrame(() => {
      setMobileSheetDragOffset(pendingSheetDragOffsetRef.current);
      sheetDragFrameRef.current = null;
    });
  }

  function handlePanelToggle() {
    if (panelOpen) {
      setPanelOpen(false);
      requestAnimationFrame(() => panelTriggerRef.current?.focus());
      return;
    }
    setMobilePanelExpanded(false);
    setPanelOpen(true);
  }

  function handleSheetHeightToggle() {
    if (suppressNextHandleClickRef.current) {
      suppressNextHandleClickRef.current = false;
      return;
    }
    if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
      return;
    }
    setMobilePanelExpanded((value) => !value);
  }

  function handleSheetHandlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const handleElement = event.currentTarget;
    const startY = event.clientY;
    activeSheetPointerIdRef.current = event.pointerId;
    setMobileSheetDragging(true);
    scheduleSheetDragOffset(0);
    handleElement.setPointerCapture(event.pointerId);

    function handlePointerMove(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== activeSheetPointerIdRef.current) {
        return;
      }
      const delta = pointerEvent.clientY - startY;
      const clampedDelta = Math.max(
        -SHEET_DRAG_PREVIEW_LIMIT_PX,
        Math.min(SHEET_DRAG_PREVIEW_LIMIT_PX, delta),
      );
      scheduleSheetDragOffset(clampedDelta);
    }

    function cleanup() {
      setMobileSheetDragging(false);
      scheduleSheetDragOffset(0);
      activeSheetPointerIdRef.current = null;
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointercancel", cleanup);
      if (handleElement.hasPointerCapture(event.pointerId)) {
        handleElement.releasePointerCapture(event.pointerId);
      }
    }

    function handlePointerUp(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== activeSheetPointerIdRef.current) {
        return;
      }
      const delta = pointerEvent.clientY - startY;
      if (Math.abs(delta) < SHEET_DRAG_THRESHOLD_PX) {
        cleanup();
        return;
      }
      suppressNextHandleClickRef.current = true;
      setMobilePanelExpanded(delta < 0);
      cleanup();
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointercancel", cleanup);
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
    <div
      className={styles.app}
      data-panel-open={panelOpen ? "true" : "false"}
      data-panel-size={mobilePanelExpanded ? "full" : "medium"}
      data-panel-dragging={mobileSheetDragging ? "true" : "false"}
      data-panel-drag-direction={mobileSheetDragDirection}
    >
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
          <div
            className={styles.dataError}
            role="alert"
            data-testid="data-load-error"
            data-e2e="data-load-error"
          >
            <p>Map data could not be loaded.</p>
            <button
              type="button"
              data-testid="retry-data-load"
              data-e2e="retry-data-load"
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
        <IconButton
          className={styles.titleToggle}
          aria-expanded={titleExpanded}
          aria-controls="title-context"
          label={
            titleExpanded ? "Minimise introduction" : "Expand introduction"
          }
          variant="embedded"
          onClick={() => setTitleExpanded(!titleExpanded)}
        >
          {titleExpanded ? (
            <Minus aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
        </IconButton>
        <div id="title-context" hidden={!titleExpanded}>
          <p className={styles.eyebrow}>South African spatial access atlas</p>
          <p className={styles.tagline}>{getAppTagline()}</p>
          <p className={styles.framing}>
            Townships were planned apart from work and services. This baseline
            makes the distance visible.
          </p>
          <p className={styles.stamp}>Data as of {DATA_AS_OF}</p>
        </div>
      </header>

      <ControlButton
        ref={panelTriggerRef}
        className={styles.panelTrigger}
        shape="pill"
        data-testid="panel-toggle"
        data-e2e="panel-toggle"
        aria-expanded={panelOpen}
        aria-controls="map-controls"
        onClick={handlePanelToggle}
      >
        {panelOpen ? <X aria-hidden="true" /> : <Layers aria-hidden="true" />}
        <span className={styles.panelTriggerLabel}>
          {panelOpen ? "Close" : "Explore"}
        </span>
      </ControlButton>

      <MobileLegend
        visibleLayerIds={visibleLayerIds}
        suppressed={false}
        panelOpen={panelOpen}
        panelExpanded={mobilePanelExpanded}
      />

      <aside
        id="map-controls"
        className={clsx(styles.panel, styles.ticked)}
        data-testid="panel-container"
        data-e2e="panel-container"
        data-panel-size={mobilePanelExpanded ? "full" : "medium"}
        data-panel-dragging={mobileSheetDragging ? "true" : "false"}
        data-panel-drag-direction={mobileSheetDragDirection}
        style={mobilePanelDragStyle}
        hidden={!panelOpen}
      >
        <button
          type="button"
          className={styles.sheetHandleButton}
          data-testid="panel-sheet-handle"
          data-e2e="panel-sheet-handle"
          data-dragging={mobileSheetDragging ? "true" : "false"}
          data-drag-direction={mobileSheetDragDirection}
          aria-pressed={mobilePanelExpanded}
          aria-label={
            mobilePanelExpanded ? "Reduce panel height" : "Expand panel height"
          }
          onPointerDown={handleSheetHandlePointerDown}
          onClick={handleSheetHeightToggle}
        >
          <span className={styles.sheetHandle} aria-hidden="true" />
        </button>
        <div
          className={styles.panelTabs}
          role="tablist"
          aria-label="Map panel"
          data-testid="panel-tablist"
          data-e2e="panel-tablist"
        >
          {PANEL_VIEWS.map((view, index) => (
            <button
              key={view}
              type="button"
              data-testid={`panel-tab-${view}`}
              data-e2e={`panel-tab-${view}`}
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
          data-view={panelView}
        >
          {panelView === "story" ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Why this map exists</h2>
              <EvidenceSummary jobCenterCount={NATIONAL_JOB_CENTER_COUNT} />
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
