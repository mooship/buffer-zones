import type { LayerDefinition } from "@buffer-zones/shared";
import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";
import { CHOROPLETH_STROKE, TOWNSHIP_FILL } from "../constants/layerStyles";
import { getTownshipGroup } from "../constants/townships";
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
          const name = feature?.properties?.name;
          const id = feature?.properties?.id;
          const isTownship =
            typeof name === "string" &&
            getTownshipGroup(name, typeof id === "string" ? id : undefined) !==
              undefined;
          return {
            fillColor: commuteMinutesToColor(value),
            fillOpacity: isTownship
              ? TOWNSHIP_FILL.fillOpacity
              : CHOROPLETH_STROKE.fillOpacity,
            weight: CHOROPLETH_STROKE.weight,
          };
        },
      };
    case "line":
      return {
        pathOptions: {
          color: style.color,
          weight: style.weight,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        },
      };
    case "point":
      return { pathOptions: { color: style.color, fillColor: style.color } };
  }
}
