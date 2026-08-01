import type { ColorBucket, Layer } from "@stratum/shared";
import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";
import { CHOROPLETH_NO_DATA_COLOR } from "../constants/layerStyles";

export interface LeafletLayerConfig {
  pathOptions?: PathOptions & { noClip?: boolean };
  styleFn?: (feature?: Feature) => PathOptions;
}

function colorForValue(
  value: number | null,
  buckets: ColorBucket[],
  noDataColor: string,
): string {
  if (value === null) {
    return noDataColor;
  }
  const bucket = buckets.find((b) => value <= b.max);
  return bucket?.color ?? buckets[buckets.length - 1]?.color ?? noDataColor;
}

export function createLayerConfig(layer: Layer): LeafletLayerConfig {
  const style = layer.style;

  switch (style.kind) {
    case "choropleth": {
      return {
        styleFn: (feature) => {
          const raw = feature?.properties?.[style.propertyKey];
          const value = typeof raw === "number" ? raw : null;
          const emphasised = style.resolveEmphasis?.(feature?.properties);
          return {
            fillColor: colorForValue(
              value,
              style.buckets,
              CHOROPLETH_NO_DATA_COLOR,
            ),
            fillOpacity: emphasised
              ? (style.emphasisOpacity ?? style.baseOpacity)
              : style.baseOpacity,
            weight: 0,
          };
        },
      };
    }
    case "line":
      return {
        pathOptions: {
          color: style.color,
          weight: style.weight,
          opacity: 0.95,
          noClip: true,
          lineCap: "round",
          lineJoin: "round",
        },
      };
    case "point":
      return { pathOptions: { color: style.color, fillColor: style.color } };
  }
}
