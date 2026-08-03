/**
 * Re-exports of the domain-agnostic `Layer`/`LayerGroup` contracts from
 * `@stratum/core`, for any domain built the same way `gauteng-spatial-legacy`
 * is. `domains/gauteng-spatial-legacy/layers.ts` itself imports `Layer`
 * directly from `@stratum/core` rather than through this stub.
 */
export type {
  CategorizedClassification,
  CategorizedStop,
  ChoroplethLayerStyle,
  Classification,
  ColorBucket,
  DomainConfig,
  FeatureGeometryKind,
  GraduatedClassification,
  GraduatedStop,
  Layer,
  LayerGroup,
  LayerGroupSelectionMode,
  LayerInteraction,
  LayerStyleConfig,
  LineLayerStyle,
  PointLayerStyle,
} from "@stratum/core";
