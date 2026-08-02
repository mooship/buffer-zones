/** The geometry rendering style for a GeoJSON layer. */
export type FeatureGeometryKind = "choropleth" | "line" | "point";

/** A single color bucket in a choropleth classification. */
export interface ColorBucket {
  /** Upper bound (inclusive) for this bucket. */
  max: number;
  /** CSS color string. */
  color: string;
  /** Human-readable label shown in the legend. */
  label: string;
}

/**
 * Style configuration for a choropleth layer.
 * @remarks Colors are resolved per-feature from `buckets` by reading `propertyKey`.
 */
export interface ChoroplethLayerStyle {
  kind: "choropleth";
  /** GeoJSON feature property whose numeric value drives color classification. */
  propertyKey: string;
  buckets: ColorBucket[];
  baseOpacity: number;
  emphasisOpacity?: number;
  /**
   * Optional resolver that returns `true` for features that should use
   * `emphasisOpacity` instead of `baseOpacity`. Receives `feature.properties`,
   * which may be `null` or `undefined`.
   */
  resolveEmphasis?: (
    properties: Record<string, unknown> | null | undefined,
  ) => boolean;
}

/** Style configuration for a line layer. */
export interface LineLayerStyle {
  kind: "line";
  color: string;
  weight: number;
  /** Label shown in the transit legend. */
  legendLabel: string;
}

/** Style configuration for a point/circle-marker layer. */
export interface PointLayerStyle {
  kind: "point";
  color: string;
  radius: number;
  legendLabel: string;
}

/** Union of all layer style configurations. */
export type LayerStyleConfig =
  | ChoroplethLayerStyle
  | LineLayerStyle
  | PointLayerStyle;

/** Interaction configuration for selectable features. */
export interface LayerInteraction {
  selectable: boolean;
  /** Feature property used as the accessible label. Defaults to `"name"`. */
  labelField?: string;
  popupFields?: string[];
}

/**
 * Platform-generic layer descriptor.
 * @remarks One `Layer` maps to one GeoJSON data source and one Leaflet layer.
 */
export interface Layer {
  id: string;
  label: string;
  description?: string;
  dataSource: readonly string[];
  /**
   * URL of a secondary GeoJSON file loaded alongside `dataSource` (e.g. area
   * boundary labels for a choropleth layer).
   */
  companionSource?: string;
  geometryKind: FeatureGeometryKind;
  defaultVisible: boolean;
  available: boolean;
  style: LayerStyleConfig;
  interaction?: LayerInteraction;
  /**
   * When `true`, this layer includes Point geometry (station/stop markers)
   * in addition to its primary geometry. Controls the dot icon in the
   * `@stratum/map` Legend component.
   */
  hasPointGeometry?: boolean;
}

/** Whether only one layer in the group can be active at a time. */
export type LayerGroupSelectionMode = "exclusive" | "independent";

/** Groups one or more layers for display and interaction in the UI. */
export interface LayerGroup {
  id: string;
  title: string;
  description?: string;
  selectionMode: LayerGroupSelectionMode;
  layerIds: string[];
}

/** Minimal domain configuration consumed by `createRegistry`. */
export interface DomainConfig {
  layers: readonly Layer[];
  layerGroups: readonly LayerGroup[];
}
