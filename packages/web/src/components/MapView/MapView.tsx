import type {
  LayerId,
  TownshipFeature,
  TownshipProperties,
} from "@buffer-zones/shared";
import type { Feature } from "geojson";
import type { Layer } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import { useLayerData } from "../../hooks/useLayerData";
import { createLayerConfig } from "../../layers/createLayerConfig";
import { LAYER_REGISTRY } from "../../layers/registry";
import { TownshipPopup } from "../TownshipPopup/TownshipPopup";
import styles from "./MapView.module.css";

interface MapViewProps {
  townships: TownshipFeature[];
  visibleLayerIds: LayerId[];
  basemap?: Basemap;
}

const PRETORIA_CENTER: [number, number] = [-25.75, 28.22];
const DEFAULT_ZOOM = 10;

function bindTownshipPopup(feature: Feature, layer: Layer) {
  const properties = feature.properties as TownshipProperties | null;
  if (!properties) {
    return;
  }
  layer.bindPopup(
    renderToStaticMarkup(<TownshipPopup properties={properties} />),
  );
}

export function MapView({
  townships,
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

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={PRETORIA_CENTER}
        zoom={DEFAULT_ZOOM}
        className={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          key={basemap}
          url={tiles.url}
          attribution={tiles.attribution}
        />
        {visibleLayers.map((layer) => {
          const config = createLayerConfig(layer);
          const isChoropleth = layer.layerType === "choropleth";
          const data = isChoropleth
            ? { type: "FeatureCollection" as const, features: townships }
            : overlayData[layer.id];

          if (!data) {
            return null;
          }

          return (
            <GeoJSON
              key={`${layer.id}-${data.features.length}`}
              data={data}
              style={config.styleFn}
              pathOptions={config.pathOptions}
              onEachFeature={isChoropleth ? bindTownshipPopup : undefined}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
