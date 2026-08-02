import type { Feature } from "geojson";
import type { PathOptions } from "leaflet";
import type {
  ChoroplethLayerStyle,
  Classification,
  GraduatedClassification,
  Layer,
} from "../types/layer";
import { resolveClassification } from "./classification";

/** Leaflet path configuration for a single layer. */
export interface LeafletLayerConfig {
  pathOptions?: PathOptions & { noClip?: boolean; radius?: number };
  styleFn?: (
    feature?: Feature,
  ) => PathOptions & { noClip?: boolean; radius?: number };
}

/**
 * Adapts a choropleth style's `buckets` into a `GraduatedClassification`, so
 * choropleth fill color resolves through the same `resolveClassification`
 * machinery as line/point classifications, instead of a separate
 * implementation of the same sort-by-max/find/fallback lookup.
 */
function bucketsToClassification(
  style: ChoroplethLayerStyle,
  noDataColor: string,
): GraduatedClassification<string> {
  return {
    kind: "graduated",
    propertyKey: style.propertyKey,
    stops: style.buckets.map((bucket) => ({
      max: bucket.max,
      value: bucket.color,
      label: bucket.label,
    })),
    fallback: noDataColor,
  };
}

function resolveStyleValue<T>(
  classification: Classification<T> | undefined,
  properties: Record<string, unknown> | null | undefined,
  fallback: T,
): T {
  return classification
    ? resolveClassification(classification, properties)
    : fallback;
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
      const classification = bucketsToClassification(style, noDataColor);
      return {
        styleFn: (feature) => {
          const emphasised = style.resolveEmphasis?.(feature?.properties);
          return {
            fillColor: resolveClassification(
              classification,
              feature?.properties,
            ),
            fillOpacity: emphasised
              ? (style.emphasisOpacity ?? style.baseOpacity)
              : style.baseOpacity,
            weight: 0,
          };
        },
      };
    }
    case "line": {
      if (style.colorClassification || style.weightClassification) {
        return {
          styleFn: (feature) => ({
            color: resolveStyleValue(
              style.colorClassification,
              feature?.properties,
              style.color,
            ),
            weight: resolveStyleValue(
              style.weightClassification,
              feature?.properties,
              style.weight,
            ),
            opacity: 0.95,
            noClip: true,
            lineCap: "round",
            lineJoin: "round",
          }),
        };
      }
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
    }
    case "point": {
      if (style.colorClassification || style.radiusClassification) {
        return {
          styleFn: (feature) => {
            const color = resolveStyleValue(
              style.colorClassification,
              feature?.properties,
              style.color,
            );
            return {
              color,
              fillColor: color,
              radius: resolveStyleValue(
                style.radiusClassification,
                feature?.properties,
                style.radius,
              ),
            };
          },
        };
      }
      return { pathOptions: { color: style.color, fillColor: style.color } };
    }
  }
}
