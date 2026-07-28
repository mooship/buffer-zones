import type {
  LayerId,
  TownshipFeature,
  TownshipProperties,
} from "@buffer-zones/shared";
import type { Feature, FeatureCollection } from "geojson";
import { type LatLng, type Layer, circleMarker } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GeoJSON,
  MapContainer,
  Pane,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import { TOWNSHIP_OUTLINE } from "../../constants/layerStyles";
import { useLayerData } from "../../hooks/useLayerData";
import { createLayerConfig } from "../../layers/createLayerConfig";
import { LAYER_REGISTRY } from "../../layers/registry";
import { TownshipPopup } from "../TownshipPopup/TownshipPopup";
import styles from "./MapView.module.css";

interface MapViewProps {
  townships: TownshipFeature[];
  townshipAreas?: Feature[];
  visibleLayerIds: LayerId[];
  basemap?: Basemap;
}

const TOWNSHIP_BOUNDS: [[number, number], [number, number]] = [
  [-25.84, 27.92],
  [-25.33, 28.5],
];
const STOP_RADIUS = 4;
const TOWNSHIP_PANE = "townships";
const TOWNSHIP_OUTLINE_PANE = "township-outlines";
const TRANSIT_PANE = "transit";

function bindTownshipPopup(feature: Feature, layer: Layer) {
  const properties = feature.properties as TownshipProperties | null;
  if (!properties) {
    return;
  }
  layer.bindPopup(
    renderToStaticMarkup(<TownshipPopup properties={properties} />),
  );
}

function bindTownshipAreaLabel(feature: Feature, layer: Layer) {
  const name = feature.properties?.name;
  if (typeof name !== "string") {
    return;
  }
  layer.bindTooltip(name, {
    permanent: true,
    direction: "center",
    className: styles.townshipLabel,
  });
}

export function MapView({
  townships,
  townshipAreas = [],
  visibleLayerIds,
  basemap = "street",
}: MapViewProps) {
  const visibleLayers = LAYER_REGISTRY.filter(
    (layer) => layer.available && visibleLayerIds.includes(layer.id),
  );
  const overlayData = useLayerData(
    visibleLayers
      .filter((layer) => layer.layerType !== "choropleth")
      .map((layer) => layer.id),
  );
  const tiles = BASEMAPS[basemap];
  const showTownships = visibleLayerIds.includes("townships");
  const townshipAreaData: FeatureCollection = {
    type: "FeatureCollection",
    features: townshipAreas,
  };
  const boundsOptions =
    window.innerWidth > 768
      ? {
          paddingTopLeft: [32, 96] as [number, number],
          paddingBottomRight: [540, 48] as [number, number],
        }
      : { padding: [24, 24] as [number, number] };

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        bounds={TOWNSHIP_BOUNDS}
        boundsOptions={boundsOptions}
        className={styles.map}
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          key={basemap}
          url={tiles.url}
          attribution={tiles.attribution}
        />
        <Pane name={TOWNSHIP_PANE} style={{ zIndex: 400 }} />
        <Pane name={TOWNSHIP_OUTLINE_PANE} style={{ zIndex: 425 }} />
        <Pane name={TRANSIT_PANE} style={{ zIndex: 450 }} />
        {showTownships && townshipAreas.length > 0 ? (
          <GeoJSON
            data={townshipAreaData}
            pathOptions={{
              ...TOWNSHIP_OUTLINE,
              pane: TOWNSHIP_OUTLINE_PANE,
              fillOpacity: 0,
              interactive: false,
            }}
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
              onEachFeature={isChoropleth ? bindTownshipPopup : undefined}
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
      </MapContainer>
    </div>
  );
}
