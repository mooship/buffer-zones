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
import { type Basemap, getBasemapTileSources } from "../../constants/basemaps";
import { TOWNSHIP_OUTLINE } from "../../constants/mapStyles";
import { useDomain } from "../../context/DomainContext";
import type { LocationSearchResult } from "../../data/locationSearch";
import { useLayerData } from "../../hooks/useLayerData";
import styles from "./MapView.module.css";

/**
 * `@types/leaflet`'s `GeoJSONOptions` omits `smoothFactor`, even though
 * Leaflet forwards it to every Polyline/Polygon layer it creates. Widen the
 * prop type locally rather than dropping the (real, behaviour-affecting)
 * `smoothFactor={0}` usage below.
 */
const GeoJSON = LeafletGeoJSON as ComponentType<
  GeoJSONProps & { smoothFactor?: number }
>;

interface MapViewProps<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
> {
  bounds: [[number, number], [number, number]];
  townships: Feature[];
  townshipAreas?: Feature[];
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
}

const TOWNSHIP_PANE = "townships";
const TOWNSHIP_OUTLINE_PANE = "township-outlines";
const TRANSIT_PANE = "transit";
const MOBILE_BREAKPOINT_PX = 768;
const TOWNSHIP_CLICK_DELAY_MS = 220;
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
  if (typeof window === "undefined") {
    return MOBILE_BREAKPOINT_PX;
  }

  return window.innerWidth;
}

function getDevicePixelRatio(): number {
  if (typeof window === "undefined") {
    return 1;
  }

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
    }, TOWNSHIP_CLICK_DELAY_MS);
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

  useEffect(() => {
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
  }, [map, selectedFeatureId, layerById, renderFeaturePopup]);

  return null;
}

function AreaLabelVisibility() {
  const map = useMap();
  const primaryLabelsClass = styles.showPrimaryLabels;
  const secondaryLabelsClass = styles.showSecondaryLabels;

  useEffect(() => {
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

function bindTownshipAreaLabel(feature: Feature, layer: Layer) {
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
        ? `${styles.townshipLabel} ${styles.townshipLabelSecondary}`
        : isMajorPrimaryLabel
          ? `${styles.townshipLabel} ${styles.townshipLabelMajor}`
          : `${styles.townshipLabel} ${styles.townshipLabelPrimary}`,
  });
}

function MapViewComponent<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
>({
  bounds,
  townships,
  townshipAreas = [],
  visibleLayerIds,
  basemap = "street",
  selectedFeatureId = null,
  focusLocationTarget = null,
  onFeatureSelect,
  renderFeaturePopup,
  onLayerDataError,
}: MapViewProps<TProperties>) {
  const { getLayers } = useDomain();
  const selectableLayerById = useRef(new Map<string, SelectableFeatureLayer>());
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: onLayerDataError intentionally omitted -- callers pass an inline function each render
  useEffect(() => {
    onLayerDataError?.(failedLayerIds);
  }, [failedLayerIds]);
  const prefersDark = usePrefersDarkMode();
  const themePreference = useThemePreference();
  const resolvedDark =
    themePreference === "dark" || (themePreference === "system" && prefersDark);
  const useDarkTiles = basemap === "street" && resolvedDark;
  const tileSourceMode = `${basemap}-${useDarkTiles ? "dark" : "light"}`;
  const tileSources = useMemo(
    () => getBasemapTileSources(basemap, useDarkTiles),
    [basemap, useDarkTiles],
  );
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
  const townshipAreaData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: townshipAreas,
    }),
    [townshipAreas],
  );
  const townshipData = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: townships,
    }),
    [townships],
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

  if (!tileSource) {
    return null;
  }

  return (
    <section
      className={styles.mapWrapper}
      data-testid="map-view"
      data-e2e="map-view"
      aria-label="Map of South African township access to job centres"
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
        <TileLayer
          key={`${tileSourceMode}-${tileSource.url}`}
          url={tileSource.url}
          attribution={tileSource.attribution}
          className={useDarkTiles ? styles.darkTile : undefined}
          detectRetina={useRetinaTiles}
          updateWhenZooming
          eventHandlers={{ tileerror: handleTileError }}
        />
        <Pane name={TOWNSHIP_PANE} style={{ zIndex: 400 }} />
        <Pane name={TOWNSHIP_OUTLINE_PANE} style={{ zIndex: 425 }} />
        <Pane name={TRANSIT_PANE} style={{ zIndex: 450 }} />
        {showAreaLabels && townshipAreas.length > 0 ? (
          <GeoJSON
            data={townshipAreaData}
            smoothFactor={0}
            pathOptions={{
              pane: TOWNSHIP_OUTLINE_PANE,
              fillOpacity: 0,
              interactive: false,
            }}
            style={(feature: Feature | undefined) => ({
              ...TOWNSHIP_OUTLINE,
              color: resolvedDark ? "#5b6476" : TOWNSHIP_OUTLINE.color,
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
            onEachFeature={bindTownshipAreaLabel}
          />
        ) : null}
        {visibleLayers.map((layer) => {
          const config = layerConfigById.get(layer.id);
          if (!config) {
            return null;
          }
          const isChoropleth = layer.geometryKind === "choropleth";
          const data = isChoropleth ? townshipData : overlayData[layer.id];

          if (!data || (isChoropleth && townships.length === 0)) {
            return null;
          }

          return (
            <GeoJSON
              key={layer.id}
              data={data}
              smoothFactor={0}
              style={config.styleFn}
              pathOptions={{
                ...config.pathOptions,
                pane: isChoropleth ? TOWNSHIP_PANE : TRANSIT_PANE,
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
      </MapContainer>
    </section>
  );
}

/**
 * Renders the interactive Leaflet map for a domain: tile basemap, choropleth
 * and transit overlays resolved from the active `DomainProvider`, township
 * area outline labels, feature selection/keyboard interaction, and
 * location-search fly-to behaviour.
 * @remarks Must be rendered inside a `DomainProvider`. `renderFeaturePopup`
 *   is invoked to produce the popup markup for a selectable feature; when
 *   omitted, clicking or selecting a feature will not show a popup.
 * @example
 * <DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
 *   <MapView
 *     bounds={[[-27.15, 27.1], [-25.3, 28.75]]}
 *     townships={townships}
 *     visibleLayerIds={["townships"]}
 *     renderFeaturePopup={(props) => <TownshipPopup properties={props} />}
 *   />
 * </DomainProvider>
 */
export const MapView = memo(MapViewComponent) as typeof MapViewComponent;
