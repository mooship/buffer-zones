import { createLayerConfig, type Layer as DomainLayer } from "@stratum/core";
import { usePrefersDarkMode, useThemePreference } from "@stratum/react";
import type { Feature, FeatureCollection } from "geojson";
import {
  circleMarker,
  type LatLng,
  type LatLngBounds,
  type Layer,
  type LeafletMouseEvent,
  type Path,
  type Renderer,
  svg,
} from "leaflet";
import {
  type ComponentType,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type GeoJSONProps,
  GeoJSON as LeafletGeoJSON,
  MapContainer,
  Pane,
  ScaleControl,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet";
import {
  type Basemap,
  getBasemapDefinition,
  getBasemapTileSources,
} from "../../constants/basemaps";
import { AREA_OUTLINE } from "../../constants/mapStyles";
import { useDomain } from "../../context/DomainContext";
import type { LocationSearchResult } from "../../data/locationSearch";
import { useLayerData } from "../../hooks/useLayerData";
import { ClickToLocatePopup } from "./ClickToLocatePopup";
import styles from "./MapView.module.css";
import { VectorBasemapLayer } from "./VectorBasemapLayer";

/**
 * `@types/leaflet`'s `GeoJSONOptions` omits `smoothFactor` and `renderer`,
 * even though react-leaflet forwards both straight through to Leaflet's
 * `GeoJSON` constructor for every Polyline/Polygon layer it creates (`{
 * data, ...options }` in `createPathComponent`'s `createGeoJSON`, unlike
 * `pathOptions`, which is only applied post-construction via `setStyle` and
 * so can't select a renderer). Widen the prop type locally rather than
 * dropping the (real, behaviour-affecting) `smoothFactor={0}`/`renderer`
 * usage below.
 */
const GeoJSON = LeafletGeoJSON as ComponentType<
  GeoJSONProps & { smoothFactor?: number; renderer?: Renderer }
>;

interface MapViewProps<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
> {
  bounds: [[number, number], [number, number]];
  /** The accessible name for the map region, e.g. "Map of flood risk near Cape Town". */
  ariaLabel: string;
  areas: Feature[];
  areaBoundaries?: Feature[];
  visibleLayerIds: string[];
  basemap?: Basemap;
  selectedFeatureId?: string | null;
  focusLocationTarget?: {
    token: number;
    location: LocationSearchResult;
  } | null;
  onFeatureSelect?: (featureId: string) => void;
  renderFeaturePopup?: (properties: TProperties) => ReactNode;
  /** Called with the ids of overlay layers whose data failed to load, whenever that set changes. */
  onLayerDataError?: (failedLayerIds: string[]) => void;
  /**
   * Called if the current vector basemap's style fails to load, so a caller
   * can fall back to another basemap instead of leaving the map blank.
   */
  onBasemapError?: (basemap: Basemap, error: unknown) => void;
  /**
   * When `true`, clicking the map background reverse-geocodes that point and
   * shows the result in a popup. Defaults to `false`.
   */
  locateOnClick?: boolean;
}

const AREA_PANE = "areas";
const AREA_OUTLINE_PANE = "area-outlines";
const TRANSIT_PANE = "transit";
const MOBILE_BREAKPOINT_PX = 768;
const AREA_CLICK_DELAY_MS = 220;
const PRIMARY_LABEL_REVEAL_ZOOM = 10;
const SECONDARY_LABEL_REVEAL_ZOOM = 12;
const MAJOR_PRIMARY_LABEL_MIN_SUBPLACES = 12;
const OVERVIEW_ZOOM_THRESHOLD = 9;
const DETAIL_ZOOM_THRESHOLD = 11;

type SelectableFeatureLayer = Layer & {
  feature?: Feature;
  bindPopup?: (content: string) => SelectableFeatureLayer;
  getPopup?: () => unknown;
  openPopup?: () => void;
  getBounds?: () => LatLngBounds;
  getElement?: () => HTMLElement | null;
};

function getViewportWidth(): number {
  /* v8 ignore start -- SSR guard: packages/web never renders MapView server-side (gated behind a client-only hydrated flag), but this is a reusable SDK component with no visibility into other consumers */
  if (typeof window === "undefined") {
    return MOBILE_BREAKPOINT_PX;
  }
  /* v8 ignore stop */

  return window.innerWidth;
}

function getDevicePixelRatio(): number {
  /* v8 ignore start -- SSR guard, see getViewportWidth above */
  if (typeof window === "undefined") {
    return 1;
  }
  /* v8 ignore stop */

  return window.devicePixelRatio;
}

function getBoundsOptions(desktop: boolean) {
  return desktop
    ? {
        paddingTopLeft: [32, 96] as [number, number],
        paddingBottomRight: [540, 48] as [number, number],
      }
    : { padding: [24, 24] as [number, number] };
}

function bindSelectedFeaturePopup<TProperties extends Record<string, unknown>>(
  featureLayer: SelectableFeatureLayer,
  properties: TProperties,
  renderFeaturePopup?: (properties: TProperties) => ReactNode,
) {
  if (featureLayer.getPopup?.()) {
    return;
  }
  if (renderFeaturePopup) {
    featureLayer.bindPopup?.(
      renderToStaticMarkup(renderFeaturePopup(properties)),
    );
  }
}

function bindSelectableFeatureInteractions<
  TProperties extends Record<string, unknown>,
>(
  feature: Feature,
  domainLayer: DomainLayer,
  leafletLayer: Layer,
  layerById: Map<string, SelectableFeatureLayer>,
  onSelect?: (featureId: string) => void,
  renderFeaturePopup?: (properties: TProperties) => ReactNode,
) {
  if (!domainLayer.interaction?.selectable) {
    return;
  }
  const properties = feature.properties as TProperties | null;
  if (!properties) {
    return;
  }
  const labelField = domainLayer.interaction.labelField ?? "name";
  const labelValue = (properties as unknown as Record<string, unknown>)[
    labelField
  ];
  const label =
    typeof labelValue === "string" ? labelValue : String(properties.name ?? "");
  const featureId = properties.id;

  if (typeof featureId === "string") {
    layerById.set(featureId, leafletLayer as SelectableFeatureLayer);
  }
  let pendingClickTimeout: ReturnType<typeof setTimeout> | null = null;
  let removeKeyboardHandler: (() => void) | null = null;

  leafletLayer.on("add", () => {
    const element = (leafletLayer as Path).getElement?.();
    if (!element) {
      return;
    }
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `View ${label}`);

    const keydownHandler: EventListener = (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
        return;
      }
      keyboardEvent.preventDefault();
      const featureLayer = leafletLayer as SelectableFeatureLayer;
      bindSelectedFeaturePopup(featureLayer, properties, renderFeaturePopup);
      featureLayer.openPopup?.();
      if (typeof featureId === "string") {
        onSelect?.(featureId);
      }
    };

    element.addEventListener("keydown", keydownHandler);
    removeKeyboardHandler = () => {
      element.removeEventListener("keydown", keydownHandler);
      removeKeyboardHandler = null;
    };
  });

  leafletLayer.on("click", (event: LeafletMouseEvent) => {
    if (pendingClickTimeout !== null) {
      clearTimeout(pendingClickTimeout);
      pendingClickTimeout = null;
    }

    const clickCount = event.originalEvent?.detail ?? 1;
    if (clickCount > 1) {
      return;
    }

    pendingClickTimeout = setTimeout(() => {
      pendingClickTimeout = null;
      const featureLayer = leafletLayer as SelectableFeatureLayer;
      bindSelectedFeaturePopup(featureLayer, properties, renderFeaturePopup);
      featureLayer.openPopup?.();
      if (typeof featureId === "string") {
        onSelect?.(featureId);
      }
    }, AREA_CLICK_DELAY_MS);
  });

  leafletLayer.on("dblclick", () => {
    if (pendingClickTimeout !== null) {
      clearTimeout(pendingClickTimeout);
      pendingClickTimeout = null;
    }
  });

  leafletLayer.on("remove", () => {
    if (pendingClickTimeout !== null) {
      clearTimeout(pendingClickTimeout);
      pendingClickTimeout = null;
    }
    if (removeKeyboardHandler) {
      removeKeyboardHandler();
    }
    if (typeof featureId === "string") {
      layerById.delete(featureId);
    }
  });
}

interface SelectedFeatureHighlightProps<
  TProperties extends Record<string, unknown>,
> {
  selectedFeatureId: string | null;
  layerById: React.RefObject<Map<string, SelectableFeatureLayer>>;
  renderFeaturePopup?: (properties: TProperties) => ReactNode;
}

function SelectedFeatureHighlight<TProperties extends Record<string, unknown>>({
  selectedFeatureId,
  layerById,
  renderFeaturePopup,
}: SelectedFeatureHighlightProps<TProperties>) {
  const map = useMap();
  const previousSelectedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousSelectedElement.current?.removeAttribute("aria-current");
    previousSelectedElement.current = null;

    if (!selectedFeatureId) {
      return;
    }
    const featureLayer = layerById.current.get(selectedFeatureId);
    if (!featureLayer) {
      return;
    }
    const properties = featureLayer.feature?.properties as
      | TProperties
      | null
      | undefined;
    if (properties) {
      bindSelectedFeaturePopup(featureLayer, properties, renderFeaturePopup);
    }
    const bounds = featureLayer.getBounds?.();
    if (bounds) {
      map.fitBounds(bounds, {
        animate: false,
        maxZoom: 12,
        padding: [40, 40],
      });
    }
    featureLayer.openPopup?.();

    const element = featureLayer.getElement?.();
    if (element) {
      element.setAttribute("aria-current", "true");
      previousSelectedElement.current = element;
    }
  }, [map, selectedFeatureId, layerById, renderFeaturePopup]);

  useEffect(
    () => () =>
      previousSelectedElement.current?.removeAttribute("aria-current"),
    [],
  );

  return null;
}

function AreaLabelVisibility() {
  const map = useMap();
  const primaryLabelsClass = styles.showPrimaryLabels;
  const secondaryLabelsClass = styles.showSecondaryLabels;

  useEffect(() => {
    /* v8 ignore next 3 -- unreachable: CSS Modules always resolve these class names to real hashed strings in a real build */
    if (!primaryLabelsClass || !secondaryLabelsClass) {
      return;
    }
    const updateVisibility = () => {
      const zoom = map.getZoom();
      map
        .getContainer()
        .classList.toggle(
          primaryLabelsClass,
          zoom >= PRIMARY_LABEL_REVEAL_ZOOM,
        );
      map
        .getContainer()
        .classList.toggle(
          secondaryLabelsClass,
          zoom >= SECONDARY_LABEL_REVEAL_ZOOM,
        );
    };
    map.on("zoomend", updateVisibility);
    updateVisibility();
    return () => {
      map.off("zoomend", updateVisibility);
    };
  }, [map]);

  return null;
}

function ResponsiveMapBounds({
  bounds,
}: {
  bounds: [[number, number], [number, number]];
}) {
  const map = useMap();
  const desktopRef = useRef(getViewportWidth() > MOBILE_BREAKPOINT_PX);
  const resizeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (resizeFrameRef.current !== null) {
        return;
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        map.invalidateSize({ animate: false });
        const desktop = getViewportWidth() > MOBILE_BREAKPOINT_PX;
        if (desktop === desktopRef.current) {
          return;
        }
        desktopRef.current = desktop;
        map.fitBounds(bounds, getBoundsOptions(desktop));
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, [map, bounds]);

  return null;
}

function ZoomStateWatcher({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const updateZoom = () => {
      onZoomChange(map.getZoom());
    };

    map.on("zoomend", updateZoom);
    updateZoom();

    return () => {
      map.off("zoomend", updateZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function FocusLocationTarget({
  focusLocationTarget,
}: {
  focusLocationTarget: { token: number; location: LocationSearchResult } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusLocationTarget) {
      return;
    }

    const bounds = focusLocationTarget.location.bounds;
    if (bounds) {
      map.fitBounds(bounds, {
        animate: false,
        maxZoom: 14,
        padding: [44, 44],
      });
      return;
    }

    const lat = focusLocationTarget.location.latitude;
    const lon = focusLocationTarget.location.longitude;

    map.fitBounds(
      [
        [lat - 0.025, lon - 0.025],
        [lat + 0.025, lon + 0.025],
      ],
      {
        animate: false,
        maxZoom: 13,
        padding: [44, 44],
      },
    );
  }, [focusLocationTarget, map]);

  return null;
}

function bindAreaBoundaryLabel(feature: Feature, layer: Layer) {
  const name = feature.properties?.name;
  const labelPriority = feature.properties?.labelPriority;
  const subPlaceCount = feature.properties?.subPlaceCount;
  const labelOffset = feature.properties?.labelOffset;
  const offset =
    Array.isArray(labelOffset) &&
    labelOffset.length === 2 &&
    typeof labelOffset[0] === "number" &&
    typeof labelOffset[1] === "number"
      ? [labelOffset[0], labelOffset[1]]
      : undefined;
  if (typeof name !== "string") {
    return;
  }
  const isMajorPrimaryLabel =
    labelPriority !== "secondary" &&
    typeof subPlaceCount === "number" &&
    subPlaceCount >= MAJOR_PRIMARY_LABEL_MIN_SUBPLACES;

  layer.bindTooltip(name, {
    permanent: true,
    direction: "center",
    ...(offset ? { offset: offset as [number, number] } : {}),
    className:
      labelPriority === "secondary"
        ? `${styles.areaLabel} ${styles.areaLabelSecondary}`
        : isMajorPrimaryLabel
          ? `${styles.areaLabel} ${styles.areaLabelMajor}`
          : `${styles.areaLabel} ${styles.areaLabelPrimary}`,
  });
}

function MapViewComponent<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
>({
  bounds,
  ariaLabel,
  areas,
  areaBoundaries = [],
  visibleLayerIds,
  basemap = "street",
  selectedFeatureId = null,
  focusLocationTarget = null,
  onFeatureSelect,
  renderFeaturePopup,
  onLayerDataError,
  onBasemapError,
  locateOnClick = false,
}: MapViewProps<TProperties>) {
  const { getLayers } = useDomain();
  const selectableLayerById = useRef(new Map<string, SelectableFeatureLayer>());
  const choroplethRenderer = useMemo(() => svg({ pane: AREA_PANE }), []);
  const visibleLayers = useMemo(
    () =>
      getLayers().filter(
        (layer) => layer.available && visibleLayerIds.includes(layer.id),
      ),
    [visibleLayerIds, getLayers],
  );
  const { data: overlayData, failedLayerIds } = useLayerData(
    visibleLayers
      .filter((layer) => layer.geometryKind !== "choropleth")
      .map((layer) => layer.id),
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: onLayerDataError intentionally omitted -- it's a public prop with no stability guarantee, so including it could re-fire this effect on every render for callers that don't memoize it
  useEffect(() => {
    onLayerDataError?.(failedLayerIds);
  }, [failedLayerIds]);
  const prefersDark = usePrefersDarkMode();
  const themePreference = useThemePreference();
  const resolvedDark =
    themePreference === "dark" || (themePreference === "system" && prefersDark);
  const basemapDefinition = getBasemapDefinition(basemap);
  const isRasterBasemap = basemapDefinition.kind === "raster";
  const isVectorBasemap = basemapDefinition.kind === "vector";
  const useDarkTiles =
    isRasterBasemap && basemapDefinition.darkUrl !== undefined && resolvedDark;
  const tileSourceMode = `${basemap}-${useDarkTiles ? "dark" : "light"}`;
  const tileSources = useMemo(
    () => (isRasterBasemap ? getBasemapTileSources(basemap, useDarkTiles) : []),
    [isRasterBasemap, basemap, useDarkTiles],
  );
  const vectorStyleUrl = isVectorBasemap
    ? (resolvedDark && basemapDefinition.darkStyleUrl) ||
      basemapDefinition.styleUrl
    : null;
  const [tileSourceState, setTileSourceState] = useState(() => ({
    mode: tileSourceMode,
    index: 0,
  }));
  const [mapZoom, setMapZoom] = useState(9);
  const currentTileSourceIndex =
    tileSourceState.mode === tileSourceMode ? tileSourceState.index : 0;
  const safeTileSourceIndex = Math.min(
    currentTileSourceIndex,
    tileSources.length - 1,
  );
  const tileSource = tileSources[safeTileSourceIndex] ?? tileSources[0];
  const handleTileError = useCallback(() => {
    setTileSourceState((currentState) => {
      const currentIndex =
        currentState.mode === tileSourceMode ? currentState.index : 0;
      if (currentIndex >= tileSources.length - 1) {
        return {
          mode: tileSourceMode,
          index: currentIndex,
        };
      }
      return {
        mode: tileSourceMode,
        index: currentIndex + 1,
      };
    });
  }, [tileSourceMode, tileSources.length]);
  const showAreaLabels = getLayers().some(
    (layer) =>
      visibleLayerIds.includes(layer.id) &&
      layer.interaction?.labelField !== undefined,
  );
  const isOverviewZoom = mapZoom < OVERVIEW_ZOOM_THRESHOLD;
  const isDetailZoom = mapZoom >= DETAIL_ZOOM_THRESHOLD;
  const transitStopRadius = isOverviewZoom ? 2 : isDetailZoom ? 4 : 3;
  const areaBoundaryData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: areaBoundaries,
    }),
    [areaBoundaries],
  );
  const areaData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: areas,
    }),
    [areas],
  );
  const layerConfigById = useMemo(
    () =>
      new Map(
        visibleLayers.map((layer) => [layer.id, createLayerConfig(layer)]),
      ),
    [visibleLayers],
  );
  const transitPointToLayerById = useMemo(
    () =>
      new Map(
        visibleLayers
          .filter((layer) => layer.geometryKind !== "choropleth")
          .map((layer) => {
            const config = layerConfigById.get(layer.id);
            return [
              layer.id,
              (_feature: Feature, latlng: LatLng) =>
                circleMarker(latlng, {
                  ...config?.pathOptions,
                  pane: TRANSIT_PANE,
                  radius: transitStopRadius,
                  fillColor: config?.pathOptions?.color,
                  fillOpacity: 1,
                  weight: 1,
                }),
            ] as const;
          }),
      ),
    [layerConfigById, transitStopRadius, visibleLayers],
  );
  const boundsOptions = getBoundsOptions(
    getViewportWidth() > MOBILE_BREAKPOINT_PX,
  );
  const useRetinaTiles =
    getDevicePixelRatio() > 1.25 && getViewportWidth() > MOBILE_BREAKPOINT_PX;

  /* v8 ignore next 3 -- unreachable: every registered raster basemap always yields at least one tile source */
  if (!isVectorBasemap && !tileSource) {
    return null;
  }

  return (
    <section
      className={styles.mapWrapper}
      data-testid="map-view"
      data-e2e="map-view"
      aria-label={ariaLabel}
    >
      <MapContainer
        bounds={bounds}
        boundsOptions={boundsOptions}
        className={styles.map}
        scrollWheelZoom
        preferCanvas
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" imperial={false} />
        {isRasterBasemap && tileSource ? (
          <TileLayer
            key={`${tileSourceMode}-${tileSource.url}`}
            url={tileSource.url}
            attribution={tileSource.attribution}
            className={useDarkTiles ? styles.darkTile : undefined}
            detectRetina={useRetinaTiles}
            updateWhenZooming
            eventHandlers={{ tileerror: handleTileError }}
          />
        ) : null}
        {vectorStyleUrl ? (
          <VectorBasemapLayer
            key={vectorStyleUrl}
            styleUrl={vectorStyleUrl}
            onError={(error) => onBasemapError?.(basemap, error)}
          />
        ) : null}
        <Pane name={AREA_PANE} style={{ zIndex: 400 }} />
        <Pane name={AREA_OUTLINE_PANE} style={{ zIndex: 425 }} />
        <Pane name={TRANSIT_PANE} style={{ zIndex: 450 }} />
        {showAreaLabels && areaBoundaries.length > 0 ? (
          <GeoJSON
            data={areaBoundaryData}
            smoothFactor={0}
            pathOptions={{
              pane: AREA_OUTLINE_PANE,
              fillOpacity: 0,
              interactive: false,
            }}
            style={(feature: Feature | undefined) => ({
              ...AREA_OUTLINE,
              color: resolvedDark ? "#5b6476" : AREA_OUTLINE.color,
              opacity: resolvedDark
                ? feature?.properties?.labelPriority === "secondary"
                  ? 0.42
                  : 0.62
                : feature?.properties?.labelPriority === "secondary"
                  ? 0.72
                  : 1,
              weight: resolvedDark
                ? feature?.properties?.labelPriority === "secondary"
                  ? 1
                  : isOverviewZoom
                    ? 1
                    : 2
                : feature?.properties?.labelPriority === "secondary"
                  ? isOverviewZoom
                    ? 1
                    : 2
                  : isOverviewZoom
                    ? 2
                    : 4,
            })}
            onEachFeature={bindAreaBoundaryLabel}
          />
        ) : null}
        {visibleLayers.map((layer) => {
          const config = layerConfigById.get(layer.id);
          /* v8 ignore next 3 -- unreachable: layerConfigById is built from this same visibleLayers list, so every layer.id here always has an entry */
          if (!config) {
            return null;
          }
          const isChoropleth = layer.geometryKind === "choropleth";
          const data = isChoropleth ? areaData : overlayData[layer.id];

          if (!data || (isChoropleth && areas.length === 0)) {
            return null;
          }

          return (
            <GeoJSON
              key={layer.id}
              data={data}
              // Leaflet's default smoothFactor (1) simplifies just enough to
              // round off the jagged real-world turns in OSM-derived transit
              // route geometry; unlike the area outline below, there's
              // no boundary-fidelity reason to disable it here.
              smoothFactor={1}
              style={config.styleFn}
              // The map defaults to the canvas renderer (`preferCanvas` on
              // `MapContainer`) since most overlay geometry doesn't need
              // per-feature DOM nodes, but the choropleth layer does:
              // bindSelectableFeatureInteractions calls `getElement()` to
              // attach `tabindex`/keyboard handlers, which canvas-rendered
              // paths never have.
              renderer={isChoropleth ? choroplethRenderer : undefined}
              pathOptions={{
                ...config.pathOptions,
                pane: isChoropleth ? AREA_PANE : TRANSIT_PANE,
              }}
              onEachFeature={
                isChoropleth
                  ? (feature: Feature, featureLayer: Layer) =>
                      bindSelectableFeatureInteractions(
                        feature,
                        layer,
                        featureLayer,
                        selectableLayerById.current,
                        onFeatureSelect,
                        renderFeaturePopup,
                      )
                  : undefined
              }
              pointToLayer={
                isChoropleth ? undefined : transitPointToLayerById.get(layer.id)
              }
            />
          );
        })}
        <SelectedFeatureHighlight
          selectedFeatureId={selectedFeatureId}
          layerById={selectableLayerById}
          renderFeaturePopup={renderFeaturePopup}
        />
        <FocusLocationTarget focusLocationTarget={focusLocationTarget} />
        <AreaLabelVisibility />
        <ResponsiveMapBounds bounds={bounds} />
        <ZoomStateWatcher onZoomChange={setMapZoom} />
        {locateOnClick ? <ClickToLocatePopup /> : null}
      </MapContainer>
    </section>
  );
}

/**
 * Renders the interactive Leaflet map for a domain: tile basemap, choropleth
 * and transit overlays resolved from the active `DomainProvider`, area
 * boundary outline labels, feature selection/keyboard interaction, and
 * location-search fly-to behaviour.
 * @remarks Must be rendered inside a `DomainProvider`. `renderFeaturePopup`
 *   is invoked to produce the popup markup for a selectable feature; when
 *   omitted, clicking or selecting a feature will not show a popup.
 * @example
 * <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
 *   <MapView
 *     bounds={[[-27.15, 27.1], [-25.3, 28.75]]}
 *     ariaLabel="Map of South African township access to job centres"
 *     areas={townships}
 *     visibleLayerIds={["townships"]}
 *     renderFeaturePopup={(props) => <TownshipPopup properties={props} />}
 *   />
 * </DomainProvider>
 */
export const MapView = memo(MapViewComponent) as typeof MapViewComponent;
