import {
  GAUTENG_SPATIAL_LEGACY_DOMAIN,
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
  lazy,
  type PointerEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWindowSize } from "usehooks-ts";
import styles from "./App.module.css";
import { LayerToggles } from "./components/LayerToggles/LayerToggles";
import { TownshipPopup } from "./components/TownshipPopup/TownshipPopup";
import { buildRegionDataUrls } from "./data/regionDataUrls";
import { createTownshipDataRepository } from "./data/TownshipDataRepository";
import { useMapUiStore } from "./stores/useMapUiStore";

const MapView = lazy(async () => {
  const { MapView } = await import("@stratum/map/MapView");
  return { default: MapView };
});

const GAUTENG_BOUNDS: [[number, number], [number, number]] = [
  [-27.15, 27.1],
  [-25.3, 28.75],
];

const MOBILE_BREAKPOINT_PX = 768;
const SHEET_DRAG_THRESHOLD_PX = 36;
const SHEET_DRAG_PREVIEW_LIMIT_PX = 96;
const SHEET_PROJECTION_DECELERATION = 0.992;
const SHEET_VELOCITY_SAMPLE_WINDOW_MS = 140;
const SHEET_CLOSE_ANIMATION_MS = 220;

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

/**
 * The reference app's root shell: fetches and merges the Gauteng township
 * choropleth data, wraps the render tree in a `DomainProvider` for
 * `gauteng-spatial-legacy`, and renders the map alongside the desktop/mobile
 * info panel (layer toggles) and its settings menu.
 * @remarks Owns the mobile bottom-sheet drag/swipe gesture state (pointer
 *   sampling, velocity-based snap projection) in addition to layout state
 *   from `useMapUiStore`. Swiping down from the sheet's medium height closes
 *   it entirely, playing an exit animation (`closePanel`) before the panel
 *   actually unmounts from the a11y tree, rather than toggling `hidden`
 *   instantly.
 */
export function App() {
  const [hydrated, setHydrated] = useState(false);
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
  const visibleLayerIds = useMapUiStore((state) => state.visibleLayerIds);
  const basemap = useMapUiStore((state) => state.basemap);
  const panelOpen = useMapUiStore((state) => state.panelOpen);
  const selectedFeatureId = useMapUiStore((state) => state.selectedFeatureId);
  const toggleLayer = useMapUiStore((state) => state.toggleLayer);
  const setBasemap = useMapUiStore((state) => state.setBasemap);
  const setPanelOpen = useMapUiStore((state) => state.setPanelOpen);
  const setSelectedFeatureId = useMapUiStore(
    (state) => state.setSelectedFeatureId,
  );
  const themePreference = useThemePreference();
  const { width } = useWindowSize({ initializeWithValue: false });
  const isDesktopViewport =
    (width ?? MOBILE_BREAKPOINT_PX) > MOBILE_BREAKPOINT_PX;
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressNextHandleClickRef = useRef(false);
  const activeSheetPointerIdRef = useRef<number | null>(null);
  const pendingSheetDragOffsetRef = useRef(0);
  const sheetDragFrameRef = useRef<number | null>(null);
  const sheetCloseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (window.innerWidth > MOBILE_BREAKPOINT_PX) {
      setPanelOpen(true);
    }
  }, [setPanelOpen]);

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
      if (sheetCloseTimeoutRef.current !== null) {
        window.clearTimeout(sheetCloseTimeoutRef.current);
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

  function closePanel() {
    if (sheetCloseTimeoutRef.current !== null) {
      window.clearTimeout(sheetCloseTimeoutRef.current);
      sheetCloseTimeoutRef.current = null;
    }
    if (isDesktopViewport) {
      setPanelOpen(false);
      requestAnimationFrame(() => panelTriggerRef.current?.focus());
      return;
    }
    setMobileSheetClosing(true);
    sheetCloseTimeoutRef.current = window.setTimeout(() => {
      sheetCloseTimeoutRef.current = null;
      setMobileSheetClosing(false);
      setPanelOpen(false);
      requestAnimationFrame(() => panelTriggerRef.current?.focus());
    }, SHEET_CLOSE_ANIMATION_MS);
  }

  function handlePanelToggle() {
    if (panelOpen) {
      closePanel();
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
                ariaLabel="Map of South African township access to job centres"
                areas={townships}
                areaBoundaries={townshipAreas}
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

        <div className={clsx(styles.locationSearchControl, styles.surface)}>
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
            className={styles.panelViewport}
            data-testid="panel-viewport"
            data-e2e="panel-viewport"
          >
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Layers</h2>
              <LayerToggles
                visibleLayerIds={visibleLayerIds}
                onToggle={toggleLayer}
                failedLayerIds={failedLayerIds}
              />
            </section>
          </div>
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
