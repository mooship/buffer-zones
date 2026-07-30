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
  circleMarker,
} from "leaflet";
import { useEffect, useMemo, useRef } from "react";
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

type TownshipFeatureLayer = Layer & {
  feature?: Feature;
  bindPopup?: (content: string) => TownshipFeatureLayer;
  getPopup?: () => unknown;
  openPopup?: () => void;
  getBounds?: () => LatLngBounds;
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
  layer.on("click", () => {
    const featureLayer = layer as TownshipFeatureLayer;
    bindTownshipPopup(featureLayer, properties);
    featureLayer.openPopup?.();
    onTownshipSelect?.(properties.id);
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

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize({ animate: false });
      const desktop = window.innerWidth > MOBILE_BREAKPOINT_PX;
      if (desktop === desktopRef.current) {
        return;
      }
      desktopRef.current = desktop;
      map.fitBounds(NATIONAL_BOUNDS, getBoundsOptions(desktop));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

export function MapView({
  townships,
  townshipAreas = [],
  visibleLayerIds,
  basemap = "street",
  selectedTownshipId = null,
  onTownshipSelect,
}: MapViewProps) {
  const townshipLayerById = useRef(new Map<string, TownshipFeatureLayer>());

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
  const useDarkTiles =
    basemap === "street" && resolvedDark && "darkUrl" in BASEMAPS.street;
  const tiles = BASEMAPS[basemap];
  const tileUrl = useDarkTiles ? BASEMAPS.street.darkUrl : tiles.url;
  const tileAttribution = useDarkTiles
    ? BASEMAPS.street.darkAttribution
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
          className={useDarkTiles ? styles.darkTile : undefined}
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
          const config = createLayerConfig(layer);
          const isChoropleth = layer.layerType === "choropleth";
          const data = isChoropleth
            ? { type: "FeatureCollection" as const, features: townships }
            : overlayData[layer.id];

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
              onEachFeature={
                isChoropleth
                  ? (feature: Feature, featureLayer: Layer) =>
                      bindTownshipFeatureInteractions(
                        feature,
                        featureLayer,
                        townshipLayerById.current,
                        onTownshipSelect,
                      )
                  : undefined
              }
              pointToLayer={(_feature: Feature, latlng: LatLng) =>
                circleMarker(latlng, {
                  ...config.pathOptions,
                  pane: TRANSIT_PANE,
                  radius: STOP_RADIUS,
                  fillColor: config.pathOptions?.color,
                  fillOpacity: 1,
                  weight: 1,
                })
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
