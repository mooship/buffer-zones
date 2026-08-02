import {
  GAUTENG_SPATIAL_LEGACY_DOMAIN,
  METROS,
  type TownshipFeature,
  type TownshipProperties,
} from "@stratum/app";
import { fetchFeatureCollection, mergeFeatureCollections } from "@stratum/core";
import {
  ControlButton,
  DesktopLegend,
  DomainProvider,
  LocationSearchControl,
  type LocationSearchResult,
  MobileLegend,
  SettingsMenu,
} from "@stratum/map";
import { setThemePreference, useThemePreference } from "@stratum/react";
import clsx from "clsx";
import type { Feature } from "geojson";
import { Layers, X } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  lazy,
  type PointerEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWindowSize } from "usehooks-ts";
import styles from "./App.module.css";
import { EvidenceSummary } from "./components/EvidenceSummary/EvidenceSummary";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { TownshipBrowser } from "./components/TownshipBrowser/TownshipBrowser";
import { TownshipPopup } from "./components/TownshipPopup/TownshipPopup";
import { DATA_SOURCES, REPOSITORY_URL } from "./constants/metadata";
import { buildRegionDataUrls } from "./data/regionDataUrls";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { type PanelView, useMapUiStore } from "./stores/useMapUiStore";

const MapView = lazy(async () => {
  const { MapView } = await import("@stratum/map/MapView");
  return { default: MapView };
});

const GAUTENG_BOUNDS: [[number, number], [number, number]] = [
  [-27.15, 27.1],
  [-25.3, 28.75],
];

const PANEL_VIEWS = ["story", "places", "layers"] as const;
const MOBILE_BREAKPOINT_PX = 768;
const SHEET_DRAG_THRESHOLD_PX = 36;
const SHEET_DRAG_PREVIEW_LIMIT_PX = 96;
const SHEET_PROJECTION_DECELERATION = 0.992;
const SHEET_VELOCITY_SAMPLE_WINDOW_MS = 140;

const PANEL_LABELS: Record<PanelView, string> = {
  story: "The pattern",
  places: "Browse places",
  layers: "Map layers",
};

const NATIONAL_JOB_CENTER_COUNT = METROS.reduce(
  (total, metro) => total + metro.jobCenterCount,
  0,
);

interface FocusLocationTarget {
  token: number;
  location: LocationSearchResult;
}

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [townships, setTownships] = useState<TownshipFeature[]>([]);
  const [townshipAreas, setTownshipAreas] = useState<Feature[]>([]);
  const [dataError, setDataError] = useState(false);
  const [failedLayerIds, setFailedLayerIds] = useState<string[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [mobileSheetDragging, setMobileSheetDragging] = useState(false);
  const [focusLocationTarget, setFocusLocationTarget] =
    useState<FocusLocationTarget | null>(null);
  const visibleLayerIds = useMapUiStore((state) => state.visibleLayerIds);
  const basemap = useMapUiStore((state) => state.basemap);
  const panelOpen = useMapUiStore((state) => state.panelOpen);
  const panelView = useMapUiStore((state) => state.panelView);
  const selectedFeatureId = useMapUiStore((state) => state.selectedFeatureId);
  const toggleLayer = useMapUiStore((state) => state.toggleLayer);
  const setBasemap = useMapUiStore((state) => state.setBasemap);
  const setPanelOpen = useMapUiStore((state) => state.setPanelOpen);
  const setPanelView = useMapUiStore((state) => state.setPanelView);
  const setSelectedFeatureId = useMapUiStore(
    (state) => state.setSelectedFeatureId,
  );
  const themePreference = useThemePreference();
  const { width } = useWindowSize({ initializeWithValue: false });
  const isDesktopViewport =
    (width ?? MOBILE_BREAKPOINT_PX) > MOBILE_BREAKPOINT_PX;
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suppressNextHandleClickRef = useRef(false);
  const activeSheetPointerIdRef = useRef<number | null>(null);
  const pendingSheetDragOffsetRef = useRef(0);
  const sheetDragFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
      setPanelOpen(true);
    }
  }, [setPanelOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-transparency: reduce)",
    );

    function applyPreference() {
      if (mediaQuery.matches) {
        document.documentElement.dataset.reducedTransparency = "true";
        return;
      }
      delete document.documentElement.dataset.reducedTransparency;
    }

    applyPreference();
    mediaQuery.addEventListener("change", applyPreference);
    return () => {
      mediaQuery.removeEventListener("change", applyPreference);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    setTownships([]);
    setTownshipAreas([]);
    const cacheBust = loadAttempt > 0 ? `?retry=${loadAttempt}` : "";
    const townshipUrls = buildRegionDataUrls(
      `townships.display.v1.geojson${cacheBust}`,
    );
    const areaUrls = buildRegionDataUrls(
      `township-areas.display.v1.geojson${cacheBust}`,
    );

    Promise.all([
      Promise.all(
        townshipUrls.map((url) =>
          createTownshipDataRepository(url).getTownships(),
        ),
      ),
      Promise.all(areaUrls.map((url) => fetchFeatureCollection(url))),
    ])
      .then(([townshipsByRegion, areasByRegion]) => {
        if (!cancelled) {
          setTownships(townshipsByRegion.flat());
          setTownshipAreas(mergeFeatureCollections(areasByRegion).features);
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
    if (isDesktopViewport) {
      return;
    }
    setMobilePanelExpanded((value) => !value);
  }

  function handleSheetHandlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (isDesktopViewport) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const handleElement = event.currentTarget;
    const startY = event.clientY;
    let latestPointerY = startY;
    const pointerSamples: Array<{ timestamp: number; y: number }> = [
      { timestamp: performance.now(), y: startY },
    ];
    activeSheetPointerIdRef.current = event.pointerId;
    setMobileSheetDragging(true);
    scheduleSheetDragOffset(0);
    handleElement.setPointerCapture(event.pointerId);

    function handlePointerMove(pointerEvent: globalThis.PointerEvent) {
      if (pointerEvent.pointerId !== activeSheetPointerIdRef.current) {
        return;
      }
      latestPointerY = pointerEvent.clientY;
      const now = performance.now();
      pointerSamples.push({ timestamp: now, y: pointerEvent.clientY });
      while (
        pointerSamples.length > 1 &&
        now - (pointerSamples[0]?.timestamp ?? now) >
          SHEET_VELOCITY_SAMPLE_WINDOW_MS
      ) {
        pointerSamples.shift();
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
      const now = performance.now();
      pointerSamples.push({ timestamp: now, y: pointerEvent.clientY });
      while (
        pointerSamples.length > 1 &&
        now - (pointerSamples[0]?.timestamp ?? now) >
          SHEET_VELOCITY_SAMPLE_WINDOW_MS
      ) {
        pointerSamples.shift();
      }

      const delta = latestPointerY - startY;
      const firstSample = pointerSamples[0];
      const lastSample = pointerSamples[pointerSamples.length - 1];
      if (!firstSample || !lastSample) {
        cleanup();
        return;
      }
      const elapsedMs = Math.max(
        1,
        lastSample.timestamp - firstSample.timestamp,
      );
      const velocityPxPerSecond =
        ((lastSample.y - firstSample.y) / elapsedMs) * 1000;
      const projectedDelta =
        delta +
        (velocityPxPerSecond / 1000) *
          (SHEET_PROJECTION_DECELERATION / (1 - SHEET_PROJECTION_DECELERATION));

      if (
        Math.abs(delta) < SHEET_DRAG_THRESHOLD_PX &&
        Math.abs(projectedDelta) < SHEET_DRAG_THRESHOLD_PX
      ) {
        cleanup();
        return;
      }
      suppressNextHandleClickRef.current = true;
      setMobilePanelExpanded(projectedDelta < 0);
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
    <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
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
          {hydrated ? (
            <Suspense
              fallback={
                <output className={styles.mapLoading}>Loading map</output>
              }
            >
              <MapView
                bounds={GAUTENG_BOUNDS}
                townships={townships}
                townshipAreas={townshipAreas}
                visibleLayerIds={visibleLayerIds}
                basemap={basemap}
                selectedFeatureId={selectedFeatureId}
                focusLocationTarget={focusLocationTarget}
                onFeatureSelect={setSelectedFeatureId}
                onLayerDataError={setFailedLayerIds}
                onBasemapError={() => setBasemap("street")}
                locateOnClick
                renderFeaturePopup={(properties) => (
                  <TownshipPopup
                    properties={properties as unknown as TownshipProperties}
                  />
                )}
              />
            </Suspense>
          ) : (
            <output className={styles.mapLoading}>Loading map</output>
          )}
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

        <div className={clsx(styles.locationSearchControl, styles.glassPanel)}>
          <LocationSearchControl
            placeholder="Search town, suburb or station"
            onLocationSelect={(location) => {
              setSelectedFeatureId(null);
              setFocusLocationTarget({ token: Date.now(), location });
            }}
          />
        </div>

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

        {isDesktopViewport ? (
          <DesktopLegend visibleLayerIds={visibleLayerIds} />
        ) : (
          <MobileLegend
            visibleLayerIds={visibleLayerIds}
            suppressed={false}
            panelOpen={panelOpen}
            panelExpanded={mobilePanelExpanded}
          />
        )}

        <aside
          id="map-controls"
          className={clsx(styles.panel, styles.glassPanel)}
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
              mobilePanelExpanded
                ? "Reduce panel height"
                : "Expand panel height"
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
                <h2 className={styles.sectionTitle}>
                  {GAUTENG_SPATIAL_LEGACY_DOMAIN.story.title}
                </h2>
                <EvidenceSummary
                  jobCenterCount={NATIONAL_JOB_CENTER_COUNT}
                  contextText={GAUTENG_SPATIAL_LEGACY_DOMAIN.story.body}
                />
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
                      Source code: mooship/stratum
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
                  selectedTownshipId={selectedFeatureId}
                  onSelect={(township) =>
                    setSelectedFeatureId(township.properties.id)
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
                    failedLayerIds={failedLayerIds}
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
    </DomainProvider>
  );
}
