import type {
  LayerId,
  TownshipFeature,
  TownshipProperties,
} from "@buffer-zones/shared";
import type { Feature, FeatureCollection } from "geojson";
import {
  type LatLng,
  type LatLngBounds,
  type Layer,
  type LeafletMouseEvent,
  type Path,
  circleMarker,
} from "leaflet";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GeoJSON,
  MapContainer,
  Pane,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { type Basemap, getBasemapTileSources } from "../../constants/basemaps";
import { TOWNSHIP_OUTLINE } from "../../constants/layerStyles";
import type { LocationSearchResult } from "../../data/locationSearch";
import { useLayerData } from "../../hooks/useLayerData";
import { usePrefersDarkMode } from "../../hooks/usePrefersDarkMode";
import { useThemePreference } from "../../hooks/useThemePreference";
import { createLayerConfig } from "../../layers/createLayerConfig";
import { getLayerDefinitions } from "../../layers/registry";
import { TownshipPopup } from "../TownshipPopup/TownshipPopup";
import styles from "./MapView.module.css";

interface MapViewProps {
  townships: TownshipFeature[];
  townshipAreas?: Feature[];
  visibleLayerIds: LayerId[];
  basemap?: Basemap;
  selectedTownshipId?: string | null;
  focusLocationTarget?: {
    token: number;
    location: LocationSearchResult;
  } | null;
  onTownshipSelect?: (townshipId: string) => void;
}

const GAUTENG_BOUNDS: [[number, number], [number, number]] = [
  [-27.15, 27.1],
  [-25.3, 28.75],
];

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

type TownshipFeatureLayer = Layer & {
  feature?: Feature;
  bindPopup?: (content: string) => TownshipFeatureLayer;
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

function bindTownshipPopup(
  featureLayer: TownshipFeatureLayer,
  properties: TownshipProperties,
) {
  if (featureLayer.getPopup?.()) {
    return;
  }
  featureLayer.bindPopup?.(
    renderToStaticMarkup(<TownshipPopup properties={properties} />),
  );
}

function bindTownshipFeatureInteractions(
  feature: Feature,
  layer: Layer,
  townshipLayerById: Map<string, TownshipFeatureLayer>,
  onTownshipSelect?: (townshipId: string) => void,
) {
  const properties = feature.properties as TownshipProperties | null;
  if (!properties) {
    return;
  }
  if (typeof properties.id === "string") {
    townshipLayerById.set(properties.id, layer as TownshipFeatureLayer);
  }
  let pendingClickTimeout: ReturnType<typeof setTimeout> | null = null;
  let removeKeyboardHandler: (() => void) | null = null;

  layer.on("add", () => {
    const element = (layer as Path).getElement?.();
    if (!element) {
      return;
    }
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", `View ${properties.name}`);

    const keydownHandler: EventListener = (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
        return;
      }
      keyboardEvent.preventDefault();
      const featureLayer = layer as TownshipFeatureLayer;
      bindTownshipPopup(featureLayer, properties);
      featureLayer.openPopup?.();
      onTownshipSelect?.(properties.id);
    };

    element.addEventListener("keydown", keydownHandler);
    removeKeyboardHandler = () => {
      element.removeEventListener("keydown", keydownHandler);
      removeKeyboardHandler = null;
    };
  });

  layer.on("click", (event: LeafletMouseEvent) => {
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
      const featureLayer = layer as TownshipFeatureLayer;
      bindTownshipPopup(featureLayer, properties);
      featureLayer.openPopup?.();
      onTownshipSelect?.(properties.id);
    }, TOWNSHIP_CLICK_DELAY_MS);
  });

  layer.on("dblclick", () => {
    if (pendingClickTimeout !== null) {
      clearTimeout(pendingClickTimeout);
      pendingClickTimeout = null;
    }
  });

  layer.on("remove", () => {
    if (pendingClickTimeout !== null) {
      clearTimeout(pendingClickTimeout);
      pendingClickTimeout = null;
    }
    if (removeKeyboardHandler) {
      removeKeyboardHandler();
    }
    if (typeof properties.id === "string") {
      townshipLayerById.delete(properties.id);
    }
  });
}

interface TownshipSelectionProps {
  selectedTownshipId: string | null;
  townshipLayerById: React.RefObject<Map<string, TownshipFeatureLayer>>;
}

function TownshipSelection({
  selectedTownshipId,
  townshipLayerById,
}: TownshipSelectionProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedTownshipId) {
      return;
    }
    const featureLayer = townshipLayerById.current.get(selectedTownshipId);
    if (!featureLayer) {
      return;
    }
    const properties = featureLayer.feature?.properties as
      | TownshipProperties
      | null
      | undefined;
    if (properties) {
      bindTownshipPopup(featureLayer, properties);
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
  }, [map, selectedTownshipId, townshipLayerById]);

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
  }, [map, primaryLabelsClass, secondaryLabelsClass]);

  return null;
}

function ResponsiveMapBounds() {
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
        map.fitBounds(GAUTENG_BOUNDS, getBoundsOptions(desktop));
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, [map]);

  return null;
}

function ZoomStateWatcher({
  onZoomChange,
}: { onZoomChange: (zoom: number) => void }) {
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

function MapViewComponent({
  townships,
  townshipAreas = [],
  visibleLayerIds,
  basemap = "street",
  selectedTownshipId = null,
  focusLocationTarget = null,
  onTownshipSelect,
}: MapViewProps) {
  const townshipLayerById = useRef(new Map<string, TownshipFeatureLayer>());
  const bindChoroplethFeature = useCallback(
    (feature: Feature, featureLayer: Layer) => {
      bindTownshipFeatureInteractions(
        feature,
        featureLayer,
        townshipLayerById.current,
        onTownshipSelect,
      );
    },
    [onTownshipSelect],
  );

  const visibleLayers = useMemo(
    () =>
      getLayerDefinitions().filter(
        (layer) => layer.available && visibleLayerIds.includes(layer.id),
      ),
    [visibleLayerIds],
  );
  const overlayData = useLayerData(
    visibleLayers
      .filter((layer) => layer.layerType !== "choropleth")
      .map((layer) => layer.id),
  );
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
  if (!tileSource) {
    return null;
  }
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
  const showAreaLabels =
    visibleLayerIds.includes("townships") ||
    visibleLayerIds.includes("nearest-transit");
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
          .filter((layer) => layer.layerType !== "choropleth")
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

  return (
    <section
      className={styles.mapWrapper}
      data-testid="map-view"
      data-e2e="map-view"
      aria-label="Map of South African township access to job centres"
    >
      <MapContainer
        bounds={GAUTENG_BOUNDS}
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
              color: resolvedDark ? "#7f8794" : TOWNSHIP_OUTLINE.color,
              opacity:
                feature?.properties?.labelPriority === "secondary" ? 0.72 : 1,
              weight:
                feature?.properties?.labelPriority === "secondary"
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
          const isChoropleth = layer.layerType === "choropleth";
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
              onEachFeature={isChoropleth ? bindChoroplethFeature : undefined}
              pointToLayer={
                isChoropleth ? undefined : transitPointToLayerById.get(layer.id)
              }
            />
          );
        })}
        <TownshipSelection
          selectedTownshipId={selectedTownshipId}
          townshipLayerById={townshipLayerById}
        />
        <FocusLocationTarget focusLocationTarget={focusLocationTarget} />
        <AreaLabelVisibility />
        <ResponsiveMapBounds />
        <ZoomStateWatcher onZoomChange={setMapZoom} />
      </MapContainer>
    </section>
  );
}

export const MapView = memo(MapViewComponent);
