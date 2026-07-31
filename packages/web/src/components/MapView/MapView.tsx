import type {
  LayerId,
  MetroId,
  TownshipFeature,
  TownshipProperties,
} from "@buffer-zones/shared";
import { getMetroDefinition } from "@buffer-zones/shared";
import type { Feature, FeatureCollection } from "geojson";
import {
  type LatLng,
  type LatLngBounds,
  type Layer,
  type LeafletMouseEvent,
  type Path,
  circleMarker,
} from "leaflet";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
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
import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import { TOWNSHIP_OUTLINE } from "../../constants/layerStyles";
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
  onTownshipSelect?: (townshipId: string) => void;
}

const NATIONAL_BOUNDS: [[number, number], [number, number]] = [
  [-35.0, 16.0],
  [-22.0, 33.0],
];

const STOP_RADIUS = 4;
const TOWNSHIP_PANE = "townships";
const TOWNSHIP_OUTLINE_PANE = "township-outlines";
const TRANSIT_PANE = "transit";
const MOBILE_BREAKPOINT_PX = 768;
const TOWNSHIP_CLICK_DELAY_MS = 220;

type TownshipFeatureLayer = Layer & {
  feature?: Feature;
  bindPopup?: (content: string) => TownshipFeatureLayer;
  getPopup?: () => unknown;
  openPopup?: () => void;
  getBounds?: () => LatLngBounds;
  getElement?: () => HTMLElement | null;
};

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
  const secondaryLabelsClass = styles.showSecondaryLabels;

  useEffect(() => {
    if (!secondaryLabelsClass) {
      return;
    }
    const updateVisibility = () => {
      map
        .getContainer()
        .classList.toggle(secondaryLabelsClass, map.getZoom() >= 12);
    };
    map.on("zoomend", updateVisibility);
    updateVisibility();
    return () => {
      map.off("zoomend", updateVisibility);
    };
  }, [map, secondaryLabelsClass]);

  return null;
}

function ResponsiveMapBounds() {
  const map = useMap();
  const desktopRef = useRef(window.innerWidth > MOBILE_BREAKPOINT_PX);
  const resizeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (resizeFrameRef.current !== null) {
        return;
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        map.invalidateSize({ animate: false });
        const desktop = window.innerWidth > MOBILE_BREAKPOINT_PX;
        if (desktop === desktopRef.current) {
          return;
        }
        desktopRef.current = desktop;
        map.fitBounds(NATIONAL_BOUNDS, getBoundsOptions(desktop));
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

function bindTownshipAreaLabel(feature: Feature, layer: Layer) {
  const name = feature.properties?.name;
  const labelPriority = feature.properties?.labelPriority;
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
  layer.bindTooltip(name, {
    permanent: true,
    direction: "center",
    ...(offset ? { offset: offset as [number, number] } : {}),
    className:
      labelPriority === "secondary"
        ? `${styles.townshipLabel} ${styles.townshipLabelSecondary}`
        : styles.townshipLabel,
  });
}

function MapViewComponent({
  townships,
  townshipAreas = [],
  visibleLayerIds,
  basemap = "street",
  selectedTownshipId = null,
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
  const tiles = BASEMAPS[basemap];
  const useDarkTiles =
    resolvedDark && "darkUrl" in tiles && typeof tiles.darkUrl === "string";
  const tileUrl = useDarkTiles ? tiles.darkUrl : tiles.url;
  const tileAttribution =
    useDarkTiles && "darkAttribution" in tiles
      ? tiles.darkAttribution
      : tiles.attribution;
  const showAreaLabels =
    visibleLayerIds.includes("townships") ||
    visibleLayerIds.includes("nearest-transit");
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
                  radius: STOP_RADIUS,
                  fillColor: config?.pathOptions?.color,
                  fillOpacity: 1,
                  weight: 1,
                }),
            ] as const;
          }),
      ),
    [layerConfigById, visibleLayers],
  );
  const boundsOptions = getBoundsOptions(
    window.innerWidth > MOBILE_BREAKPOINT_PX,
  );
  const useRetinaTiles =
    window.devicePixelRatio > 1.25 && window.innerWidth > MOBILE_BREAKPOINT_PX;

  return (
    <section
      className={styles.mapWrapper}
      data-testid="map-view"
      data-e2e="map-view"
      aria-label="Map of South African township access to job centres"
    >
      <MapContainer
        bounds={NATIONAL_BOUNDS}
        boundsOptions={boundsOptions}
        className={styles.map}
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" imperial={false} />
        <TileLayer
          key={`${basemap}-${useDarkTiles ? "dark" : "light"}`}
          url={tileUrl}
          attribution={tileAttribution}
          detectRetina={useRetinaTiles}
        />
        <Pane name={TOWNSHIP_PANE} style={{ zIndex: 400 }} />
        <Pane name={TOWNSHIP_OUTLINE_PANE} style={{ zIndex: 425 }} />
        <Pane name={TRANSIT_PANE} style={{ zIndex: 450 }} />
        {showAreaLabels && townshipAreas.length > 0 ? (
          <GeoJSON
            data={townshipAreaData}
            pathOptions={{
              pane: TOWNSHIP_OUTLINE_PANE,
              fillOpacity: 0,
              interactive: false,
            }}
            style={(feature: Feature | undefined) => ({
              ...TOWNSHIP_OUTLINE,
              opacity:
                feature?.properties?.labelPriority === "secondary" ? 0.72 : 1,
              weight:
                feature?.properties?.labelPriority === "secondary" ? 2 : 4,
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
        <AreaLabelVisibility />
        <ResponsiveMapBounds />
      </MapContainer>
    </section>
  );
}

export const MapView = memo(MapViewComponent);
