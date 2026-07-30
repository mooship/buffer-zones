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
  type Layer,
  type GeoJSON as LeafletGeoJSON,
  circleMarker,
} from "leaflet";
import { useEffect, useRef } from "react";
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

function getBoundsOptions(desktop: boolean) {
  return desktop
    ? {
        paddingTopLeft: [32, 96] as [number, number],
        paddingBottomRight: [540, 48] as [number, number],
      }
    : { padding: [24, 24] as [number, number] };
}

function bindTownshipPopup(
  feature: Feature,
  layer: Layer,
  onTownshipSelect?: (townshipId: string) => void,
) {
  const properties = feature.properties as TownshipProperties | null;
  if (!properties) {
    return;
  }
  layer.bindPopup(
    renderToStaticMarkup(<TownshipPopup properties={properties} />),
  );
  layer.on("click", () => onTownshipSelect?.(properties.id));
}

interface TownshipSelectionProps {
  selectedTownshipId: string | null;
  townshipLayer: React.RefObject<LeafletGeoJSON | null>;
}

function TownshipSelection({
  selectedTownshipId,
  townshipLayer,
}: TownshipSelectionProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedTownshipId) {
      return;
    }
    townshipLayer.current?.eachLayer((layer) => {
      const featureLayer = layer as Layer & {
        feature?: Feature;
        getBounds?: () => L.LatLngBounds;
        openPopup?: () => void;
      };
      if (featureLayer.feature?.properties?.id !== selectedTownshipId) {
        return;
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
    });
  }, [map, selectedTownshipId, townshipLayer]);

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
  if (typeof name !== "string") {
    return;
  }
  layer.bindTooltip(name, {
    permanent: true,
    direction: "center",
    ...(feature.properties?.id === "saulsville"
      ? { offset: [0, 18] as [number, number] }
      : {}),
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
  const townshipLayerRef = useRef<LeafletGeoJSON | null>(null);
  const visibleLayers = getLayerDefinitions().filter(
    (layer) => layer.available && visibleLayerIds.includes(layer.id),
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
  const townshipAreaData: FeatureCollection = {
    type: "FeatureCollection",
    features: townshipAreas,
  };
  const boundsOptions = getBoundsOptions(
    window.innerWidth > MOBILE_BREAKPOINT_PX,
  );

  return (
    <section
      className={styles.mapWrapper}
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
          detectRetina
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
              ref={isChoropleth ? townshipLayerRef : undefined}
              data={data}
              style={config.styleFn}
              pathOptions={{
                ...config.pathOptions,
                pane: isChoropleth ? TOWNSHIP_PANE : TRANSIT_PANE,
              }}
              onEachFeature={
                isChoropleth
                  ? (feature: Feature, featureLayer: Layer) =>
                      bindTownshipPopup(feature, featureLayer, onTownshipSelect)
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
          townshipLayer={townshipLayerRef}
        />
        <AreaLabelVisibility />
        <ResponsiveMapBounds />
      </MapContainer>
    </section>
  );
}
