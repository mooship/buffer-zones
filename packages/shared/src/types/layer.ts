export type LayerId =
  | "townships"
  | "gautrain"
  | "gautrain-bus"
  | "a-re-yeng"
  | "unemployment"
  | "myciti"
  | "prasa"
  | "rea-vaya"
  | "metrobus"
  | "durban-transport";

export type LayerType = "choropleth" | "line" | "point";

export interface ChoroplethStyle {
  kind: "choropleth";
  propertyKey: string;
}

export interface LineStyle {
  kind: "line";
  color: string;
  weight: number;
}

export interface PointStyle {
  kind: "point";
  color: string;
  radius: number;
}

export type LayerStyle = ChoroplethStyle | LineStyle | PointStyle;

export interface LayerDefinition {
  id: LayerId;
  label: string;
  dataSource: string;
  layerType: LayerType;
  defaultVisible: boolean;
  available: boolean;
  style?: LayerStyle;
}
