import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";
import type { ColorBucket, Layer } from "../types/layer";

/** Leaflet path configuration for a single layer. */
export interface LeafletLayerConfig {
  pathOptions?: PathOptions & { noClip?: boolean };
  styleFn?: (feature?: Feature) => PathOptions;
}

function colorForValue(
  value: number | null,
  sortedBuckets: ColorBucket[],
  noDataColor: string,
): string {
  if (value === null) {
    return noDataColor;
  }
  const bucket = sortedBuckets.find((b) => value <= b.max);
  return bucket?.color ?? sortedBuckets.at(-1)?.color ?? noDataColor;
}

/**
 * Converts a `Layer` descriptor into a Leaflet path configuration object.
 * @param layer - The layer to configure.
 * @param noDataColor - CSS color used when a choropleth feature has no value.
 *   Defaults to `"#8A93A5"`.
 * @returns A `LeafletLayerConfig` with either `pathOptions` or `styleFn`.
 * @example
 * const { styleFn } = createLayerConfig(layer);
 * return <GeoJSON data={data} style={styleFn} />;
 */
export function createLayerConfig(
  layer: Layer,
  noDataColor = "#8A93A5",
): LeafletLayerConfig {
  const style = layer.style;

  switch (style.kind) {
    case "choropleth": {
      const sortedBuckets = [...style.buckets].sort((a, b) => a.max - b.max);
      return {
        styleFn: (feature) => {
          const raw = feature?.properties?.[style.propertyKey];
          const value = typeof raw === "number" ? raw : null;
          const emphasised = style.resolveEmphasis?.(feature?.properties);
          return {
            fillColor: colorForValue(value, sortedBuckets, noDataColor),
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
