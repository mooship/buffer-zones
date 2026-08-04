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
  /** Fill opacity (0–1) applied when a feature isn't emphasised via `resolveEmphasis`. */
  baseOpacity: number;
  /**
   * Fill opacity (0–1) applied instead of `baseOpacity` when `resolveEmphasis`
   * returns `true` for a feature. Falls back to `baseOpacity` when omitted.
   */
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
  /** Fallback color, used when `colorClassification` is absent or unmatched. */
  color: string;
  /** Fallback weight, used when `weightClassification` is absent or unmatched. */
  weight: number;
  /** Label shown in the transit legend. */
  legendLabel: string;
  /** Optional per-feature color classification, overriding `color`. */
  colorClassification?: Classification<string>;
  /** Optional per-feature weight classification, overriding `weight`. */
  weightClassification?: Classification<number>;
}

/** Style configuration for a point/circle-marker layer. */
export interface PointLayerStyle {
  kind: "point";
  /** Fallback color, used when `colorClassification` is absent or unmatched. */
  color: string;
  /** Fallback radius, used when `radiusClassification` is absent or unmatched. */
  radius: number;
  /** Label shown in the transit legend. */
  legendLabel: string;
  /** Optional per-feature color classification, overriding `color`. */
  colorClassification?: Classification<string>;
  /** Optional per-feature radius classification, overriding `radius`. */
  radiusClassification?: Classification<number>;
}

/** Union of all layer style configurations. */
export type LayerStyleConfig =
  | ChoroplethLayerStyle
  | LineLayerStyle
  | PointLayerStyle;

/** A single stop in a graduated (numeric range) classification. */
export interface GraduatedStop<T> {
  /** Upper bound (inclusive) of this stop's numeric range. */
  max: number;
  value: T;
  /** Human-readable label shown in the legend. */
  label: string;
}

/** A single stop in a categorized (exact string match) classification. */
export interface CategorizedStop<T> {
  /** Exact feature-property string value this stop matches. */
  match: string;
  value: T;
  /** Human-readable label shown in the legend. */
  label: string;
}

/** Classifies a numeric feature property into ranges, each mapped to a style value. */
export interface GraduatedClassification<T> {
  kind: "graduated";
  /** GeoJSON feature property whose numeric value drives classification. */
  propertyKey: string;
  stops: GraduatedStop<T>[];
  /** Value used when the property is missing, non-numeric, or below every stop's max. */
  fallback: T;
}

/** Classifies a string feature property by exact match, each mapped to a style value. */
export interface CategorizedClassification<T> {
  kind: "categorized";
  /** GeoJSON feature property whose string value drives classification. */
  propertyKey: string;
  stops: CategorizedStop<T>[];
  /** Value used when the property is missing, non-string, or matches no stop. */
  fallback: T;
}

/**
 * Data-driven style value: classifies a feature property into a style output
 * of type `T`, either by numeric range (`"graduated"`) or exact string match
 * (`"categorized"`).
 * @remarks Usable for any geometry kind's style fields (e.g. line color/weight,
 * point color/radius) — not limited to choropleth fill color.
 */
export type Classification<T> =
  | GraduatedClassification<T>
  | CategorizedClassification<T>;

/** Interaction configuration for selectable features. */
export interface LayerInteraction {
  /** Whether clicking or keyboard-activating a feature selects it and can open a popup. */
  selectable: boolean;
  /** Feature property used as the accessible label. Defaults to `"name"`. */
  labelField?: string;
  /**
   * Feature properties relevant to this layer's popup content, for a caller's
   * own reference. Not read by `@stratum/core` or `@stratum/map` — popup
   * content is entirely up to the caller's `renderFeaturePopup`.
   */
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
  /**
   * URLs to fetch and merge into one `FeatureCollection` for this layer (see
   * `mergeFeatureCollections`). Usually a single URL; multiple entries
   * combine several source files into one layer.
   */
  dataSource: readonly string[];
  /**
   * URL of a secondary GeoJSON file loaded alongside `dataSource` (e.g. area
   * boundary labels for a choropleth layer).
   */
  companionSource?: string;
  geometryKind: FeatureGeometryKind;
  /** Whether this layer is switched on by default when the domain first loads. */
  defaultVisible: boolean;
  /**
   * Whether this layer is offered at all. `false` hides it from layer
   * toggles entirely — distinct from `defaultVisible`, which only controls
   * its initial visibility state once available.
   */
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
  /** Ids of the `Layer`s belonging to this group, in display order. */
  layerIds: string[];
}

/**
 * Narrative "why this map exists" copy for a domain, surfaced by consumers
 * as a Story view alongside layer controls.
 * @remarks Optional: a domain with nothing to say here simply omits `story`
 *   from its `DomainConfig`, and callers should treat that as "no story view".
 */
export interface DomainStory {
  title: string;
  body: string;
}

/** Minimal domain configuration consumed by `createRegistry`. */
export interface DomainConfig {
  layers: readonly Layer[];
  layerGroups: readonly LayerGroup[];
  story?: DomainStory;
}
