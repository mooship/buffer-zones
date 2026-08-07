import {
  GAUTENG_SPATIAL_LEGACY_DOMAIN,
  type TownshipFeature,
  type TownshipProperties,
} from "@karta/app";
import {
  type DomainStory as DomainStoryContent,
  fetchFeatureCollection,
  mergeFeatureCollections,
} from "@karta/core";
import {
  ControlButton,
  DesktopLegend,
  DomainProvider,
  LocationSearchControl,
  type LocationSearchResult,
  MobileLegend,
  SettingsMenu,
} from "@karta/map";
import { setThemePreference, useThemePreference } from "@karta/react";
import clsx from "clsx";
import type { Feature } from "geojson";
import { Layers, X } from "lucide-react";
import {
  type AnimationEvent,
  type CSSProperties,
  type KeyboardEvent,
  lazy,
  type PointerEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWindowSize } from "usehooks-ts";
import styles from "./App.module.css";
import { DomainStory } from "./components/DomainStory/DomainStory";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { TownshipPopup } from "./components/TownshipPopup/TownshipPopup";
import { buildRegionDataUrls } from "./data/regionDataUrls";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { useMapModelContextTools } from "./hooks/useMapModelContextTools";
import { getStory } from "./layers/registry";
import { type PanelView, useMapUiStore } from "./stores/useMapUiStore";

const MapView = lazy(async () => {
  const { MapView } = await import("@karta/map/MapView");
  return { default: MapView };
});

/** A Leaflet-style `[[south, west], [north, east]]` bounding rectangle. */
type LatLngBoundsTuple = [[number, number], [number, number]];

const GAUTENG_BOUNDS: LatLngBoundsTuple = [
  [-27.15, 27.1],
  [-25.3, 28.75],
];

/**
 * Mainland South Africa's approximate extent, used only to sanity-check
 * location search results (see `isWithinSearchCoverage`) — not the map's
 * initial viewport, which stays framed on Gauteng via `GAUTENG_BOUNDS` since
 * that's the only region with actual layer data today.
 */
const SEARCH_COVERAGE_BOUNDS: LatLngBoundsTuple = [
  [-34.84, 16.45],
  [-22.13, 32.95],
];

/**
 * Whether `location` falls within `SEARCH_COVERAGE_BOUNDS`.
 * @remarks Nominatim searches the whole world, so a query can resolve to a
 *   place far outside South Africa entirely; flying the map there would just
 *   show an empty basemap with no explanation. The mapped data itself is
 *   Gauteng-only, but the basemap and search cover the whole country.
 */
function isWithinSearchCoverage(location: LocationSearchResult): boolean {
  const [[south, west], [north, east]] = SEARCH_COVERAGE_BOUNDS;
  return (
    location.latitude >= south &&
    location.latitude <= north &&
    location.longitude >= west &&
    location.longitude <= east
  );
}

const STORY = getStory();
const PANEL_VIEWS: readonly PanelView[] = STORY
  ? (["layers", "story"] as const)
  : (["layers"] as const);
const PANEL_LABELS: Record<PanelView, string> = {
  layers: "Layers",
  story: "Story",
};
const PANEL_VIEWPORT_PROPS = {
  className: styles.panelViewport,
  "data-testid": "panel-viewport",
  "data-e2e": "panel-viewport",
} as const;

const MOBILE_BREAKPOINT_PX = 768;
const SHEET_DRAG_THRESHOLD_PX = 36;
const SHEET_DRAG_PREVIEW_LIMIT_PX = 96;
const SHEET_PROJECTION_DECELERATION = 0.992;
const SHEET_VELOCITY_SAMPLE_WINDOW_MS = 140;

interface FocusLocationTarget {
  token: number;
  location: LocationSearchResult;
}

interface PointerSample {
  timestamp: number;
  y: number;
}

function pruneStalePointerSamples(samples: PointerSample[], now: number) {
  while (samples.length > 1) {
    const oldest = samples[0];
    /* v8 ignore next 3 -- unreachable: the length check above guarantees samples[0] exists */
    if (!oldest) {
      break;
    }
    if (now - oldest.timestamp <= SHEET_VELOCITY_SAMPLE_WINDOW_MS) {
      break;
    }
    samples.shift();
  }
}

interface PanelViewContentProps {
  panelView: PanelView;
  visibleLayerIds: string[];
  onToggle: (id: string) => void;
  failedLayerIds: string[];
  story: DomainStoryContent | undefined;
}

/** Renders the info panel's active view: layer toggles, or the domain's story copy. */
function PanelViewContent({
  panelView,
  visibleLayerIds,
  onToggle,
  failedLayerIds,
  story,
}: PanelViewContentProps) {
  if (panelView === "story" && story) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{story.title}</h2>
        <DomainStory story={story} />
      </section>
    );
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Layers</h2>
      <LayerToggles
        visibleLayerIds={visibleLayerIds}
        onToggle={onToggle}
        failedLayerIds={failedLayerIds}
      />
    </section>
  );
}

/**
 * The reference app's root shell: fetches and merges the Gauteng township
 * choropleth data, wraps the render tree in a `DomainProvider` for
 * `gauteng-spatial-legacy`, and renders the map alongside the desktop/mobile
 * info panel and its settings menu.
 * @remarks That township fetch deliberately waits for `MapView`'s `onReady`
 *   (tracked as `mapReady`) rather than starting at mount. Downloading,
 *   validating and handing Leaflet ~2,500 polygons is seconds of
 *   main-thread work on a mid-range phone, and none of it can be drawn
 *   before the map exists — started at mount it simply ran in front of the
 *   map's own first paint and delayed it by all of that. The retry path
 *   (`loadAttempt`) still works unchanged, since the map stays ready.
 *   The info panel shows layer toggles, plus a Story tab reading its
 *   copy from the domain's `story` (via `getStory()`) whenever the active
 *   domain defines one — a domain that omits `story` gets no tab UI at all,
 *   matching today's single-view panel. `PANEL_VIEWS`/`STORY` are computed
 *   once at module scope since the domain's story never changes at runtime.
 *   Also owns the mobile bottom-sheet drag/swipe gesture state (pointer
 *   sampling, velocity-based snap projection) in addition to layout state
 *   from `useMapUiStore`. Swiping down from the sheet's medium height closes
 *   it entirely: `closePanel` plays an exit animation and `finishClose`
 *   (unmounting the panel from the a11y tree) fires from that animation's
 *   `animationend`, so the CSS duration in App.module.css stays the single
 *   source of truth — except under `prefers-reduced-motion`/desktop, where
 *   no animation plays and `closePanel` calls `finishClose` immediately.
 *   `useMapModelContextTools` registers this app's layer/search/basemap/theme/
 *   story capabilities as WebMCP tools; `handleLocationSelect` is shared
 *   between `LocationSearchControl`'s `onLocationSelect` and that hook's
 *   `search-map-location` tool, so a human picking a result and an agent
 *   calling the tool fly the map the same way.
 */
export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [townships, setTownships] = useState<TownshipFeature[]>([]);
  const [townshipAreas, setTownshipAreas] = useState<Feature[]>([]);
  const [dataError, setDataError] = useState(false);
  const [failedLayerIds, setFailedLayerIds] = useState<string[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false);
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [mobileSheetDragging, setMobileSheetDragging] = useState(false);
  const [mobileSheetClosing, setMobileSheetClosing] = useState(false);
  const [focusLocationTarget, setFocusLocationTarget] =
    useState<FocusLocationTarget | null>(null);
  const [outOfCoverageLocationLabel, setOutOfCoverageLocationLabel] = useState<
    string | null
  >(null);
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
    if (!mapReady) {
      return;
    }
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
  }, [loadAttempt, mapReady]);

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

  const handleMapReady = useCallback(() => setMapReady(true), []);

  function handleLocationSelect(location: LocationSearchResult): string {
    if (!isWithinSearchCoverage(location)) {
      setOutOfCoverageLocationLabel(location.label);
      return `${location.label} is outside South Africa.`;
    }
    setOutOfCoverageLocationLabel(null);
    setSelectedFeatureId(null);
    setFocusLocationTarget({ token: Date.now(), location });
    return `Flew to ${location.label}.`;
  }

  useMapModelContextTools({
    onLocationSelect: handleLocationSelect,
    story: STORY,
    onShowStory: () => {
      setPanelView("story");
      setPanelOpen(true);
    },
  });

  function finishClose() {
    setMobileSheetClosing(false);
    setPanelOpen(false);
    requestAnimationFrame(() => panelTriggerRef.current?.focus());
  }

  function closePanel() {
    const playsExitAnimation =
      !isDesktopViewport &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!playsExitAnimation) {
      finishClose();
      return;
    }
    setMobileSheetClosing(true);
  }

  function handleSheetAnimationEnd(event: AnimationEvent<HTMLElement>) {
    // CSS Modules hashes @keyframes names, so animationName can't be matched
    // against a literal here; requiring the event to originate on the panel
    // itself (not bubble up from a child like .panelViewport's own entrance
    // animation) is enough, since .panel only ever animates while closing.
    if (mobileSheetClosing && event.target === event.currentTarget) {
      finishClose();
    }
  }

  function handlePanelToggle() {
    if (panelOpen) {
      closePanel();
      return;
    }
    setMobilePanelExpanded(false);
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
    /* v8 ignore next 3 -- unreachable: nextIndex is always derived via modulo of PANEL_VIEWS.length or clamped to its bounds above, so it always indexes an existing entry */
    if (!nextView) {
      return;
    }
    setPanelView(nextView);
    tabRefs.current[nextIndex]?.focus();
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
    const pointerSamples: PointerSample[] = [
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
      pruneStalePointerSamples(pointerSamples, now);
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
      pruneStalePointerSamples(pointerSamples, now);

      const delta = latestPointerY - startY;
      const firstSample = pointerSamples[0];
      const lastSample = pointerSamples[pointerSamples.length - 1];
      /* v8 ignore next 4 -- unreachable: pointerSamples is seeded with one entry on pointer down and the prune loop above always stops at length 1, so it's never empty here */
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
      if (projectedDelta < 0) {
        setMobilePanelExpanded(true);
      } else if (mobilePanelExpanded) {
        setMobilePanelExpanded(false);
      } else {
        closePanel();
      }
      cleanup();
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointercancel", cleanup);
  }

  const panelViewContent = (
    <PanelViewContent
      panelView={panelView}
      visibleLayerIds={visibleLayerIds}
      onToggle={toggleLayer}
      failedLayerIds={failedLayerIds}
      story={STORY}
    />
  );

  const panelToggleLabel = panelOpen ? "Close" : "Explore";

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

        <header className={styles.visuallyHidden}>
          <h1>Karta: Gauteng spatial legacy map</h1>
        </header>

        <main id="map-information" tabIndex={-1}>
          {hydrated ? (
            <Suspense
              fallback={
                <output className={styles.mapLoading}>Loading map</output>
              }
            >
              <MapView
                bounds={GAUTENG_BOUNDS}
                ariaLabel="Map of South African township access to job centres"
                areas={townships}
                areaBoundaries={townshipAreas}
                visibleLayerIds={visibleLayerIds}
                basemap={basemap}
                selectedFeatureId={selectedFeatureId}
                focusLocationTarget={focusLocationTarget}
                onFeatureSelect={setSelectedFeatureId}
                onLayerDataError={setFailedLayerIds}
                onReady={handleMapReady}
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

        <div className={clsx(styles.locationSearchControl, styles.surface)}>
          <LocationSearchControl
            placeholder="Search town, suburb or station"
            onLocationSelect={handleLocationSelect}
          />
          {outOfCoverageLocationLabel ? (
            <output
              className={styles.outOfCoverage}
              data-testid="location-out-of-coverage"
              data-e2e="location-out-of-coverage"
            >
              {`${outOfCoverageLocationLabel} is outside South Africa.`}
            </output>
          ) : null}
        </div>

        <ControlButton
          ref={panelTriggerRef}
          className={styles.panelTrigger}
          shape="pill"
          data-testid="panel-toggle"
          data-e2e="panel-toggle"
          aria-expanded={panelOpen}
          aria-controls="map-controls"
          label={panelToggleLabel}
          onClick={handlePanelToggle}
        >
          {panelOpen ? <X aria-hidden="true" /> : <Layers aria-hidden="true" />}
          <span className={styles.panelTriggerLabel} aria-hidden="true">
            {panelToggleLabel}
          </span>
        </ControlButton>

        {isDesktopViewport ? (
          <DesktopLegend
            visibleLayerIds={visibleLayerIds}
            suppressed={settingsOpen}
          />
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
          className={clsx(styles.panel, styles.surface)}
          data-testid="panel-container"
          data-e2e="panel-container"
          data-panel-size={mobilePanelExpanded ? "full" : "medium"}
          data-panel-dragging={mobileSheetDragging ? "true" : "false"}
          data-panel-drag-direction={mobileSheetDragDirection}
          data-panel-closing={mobileSheetClosing ? "true" : "false"}
          style={mobilePanelDragStyle}
          hidden={!panelOpen}
          onAnimationEnd={handleSheetAnimationEnd}
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
          {PANEL_VIEWS.length > 1 ? (
            <>
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
                {...PANEL_VIEWPORT_PROPS}
                id={`panel-view-${panelView}`}
                role="tabpanel"
                aria-labelledby={`panel-tab-${panelView}`}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA APG recommends tabindex=0 on a tabpanel so keyboard users can reach panels (like Story) whose content has no focusable element of its own
                tabIndex={0}
              >
                {panelViewContent}
              </div>
            </>
          ) : (
            <div {...PANEL_VIEWPORT_PROPS}>{panelViewContent}</div>
          )}
        </aside>

        <div className={styles.settingsControl}>
          <SettingsMenu
            basemap={basemap}
            onBasemapChange={setBasemap}
            themePreference={themePreference}
            onThemePreferenceChange={setThemePreference}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </div>
    </DomainProvider>
  );
}
