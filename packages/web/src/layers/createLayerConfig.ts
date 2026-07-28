import type { LayerDefinition } from "@buffer-zones/shared";
import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";
import { CHOROPLETH_STROKE } from "../constants/layerStyles";
import { commuteMinutesToColor } from "../utils/colorScale";

export interface LeafletLayerConfig {
  pathOptions?: PathOptions;
  styleFn?: (feature?: Feature) => PathOptions;
}

export function createLayerConfig(
  definition: LayerDefinition,
): LeafletLayerConfig {
  const style = definition.style;
  if (!style) {
    return {};
  }

  switch (style.kind) {
    case "choropleth":
      return {
        styleFn: (feature) => {
          const raw = feature?.properties?.[style.propertyKey];
          const value = typeof raw === "number" ? raw : null;
          return {
            fillColor: commuteMinutesToColor(value),
            fillOpacity: CHOROPLETH_STROKE.fillOpacity,
            weight: CHOROPLETH_STROKE.weight,
            color: CHOROPLETH_STROKE.color,
          };
        },
      };
    case "line":
      return { pathOptions: { color: style.color, weight: style.weight } };
    case "point":
      return { pathOptions: { color: style.color, fillColor: style.color } };
  }
}
