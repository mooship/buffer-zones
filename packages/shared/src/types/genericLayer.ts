export type FeatureGeometryKind = "choropleth" | "line" | "point";

export interface ColorBucket {
  max: number;
  color: string;
  label: string;
}

export interface ChoroplethLayerStyle {
  kind: "choropleth";
  propertyKey: string;
  buckets: ColorBucket[];
  baseOpacity: number;
  emphasisOpacity?: number;
  resolveEmphasis?: (
    properties: Record<string, unknown> | null | undefined,
  ) => boolean;
}

export interface LineLayerStyle {
  kind: "line";
  color: string;
  weight: number;
  legendLabel: string;
}

export interface PointLayerStyle {
  kind: "point";
  color: string;
  radius: number;
  legendLabel: string;
}

export type LayerStyleConfig =
  | ChoroplethLayerStyle
  | LineLayerStyle
  | PointLayerStyle;

export interface LayerInteraction {
  selectable: boolean;
  labelField?: string;
  popupFields?: string[];
}

export interface Layer {
  id: string;
  label: string;
  description?: string;
  dataSource: readonly string[];
  companionSource?: string;
  geometryKind: FeatureGeometryKind;
  defaultVisible: boolean;
  available: boolean;
  style: LayerStyleConfig;
  interaction?: LayerInteraction;
}

export type LayerGroupSelectionMode = "exclusive" | "independent";

export interface LayerGroup {
  id: string;
  title: string;
  description?: string;
  selectionMode: LayerGroupSelectionMode;
  layerIds: string[];
}
