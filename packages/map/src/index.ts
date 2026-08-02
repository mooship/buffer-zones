// `MapView` is intentionally NOT re-exported here: it pulls in Leaflet and
// react-leaflet, and consumers that code-split it behind `lazy()`/`import()`
// need `@stratum/map/MapView` (see package.json `exports`) to keep that
// bundle boundary — re-exporting it from this barrel would make it
// statically reachable from any import of this module, defeating the split.
export { BasemapToggle } from "./components/BasemapToggle/BasemapToggle";
export type {
  ControlButtonProps,
  ControlButtonShape,
  ControlButtonVariant,
} from "./components/ControlButton/ControlButton";
export { ControlButton } from "./components/ControlButton/ControlButton";
export { DesktopLegend } from "./components/DesktopLegend/DesktopLegend";
export { IconButton } from "./components/IconButton/IconButton";
export { Legend } from "./components/Legend/Legend";
export { LocationSearchControl } from "./components/LocationSearchControl/LocationSearchControl";
export { MobileLegend } from "./components/MobileLegend/MobileLegend";
export type { SegmentedControlOption } from "./components/SegmentedControl/SegmentedControl";
export { SegmentedControl } from "./components/SegmentedControl/SegmentedControl";
export { SettingsMenu } from "./components/SettingsMenu/SettingsMenu";
export { ThemeToggle } from "./components/ThemeToggle/ThemeToggle";
export type { Basemap } from "./constants/basemaps";
export { getBasemapTileSources } from "./constants/basemaps";
export { TOWNSHIP_OUTLINE } from "./constants/mapStyles";
export type { DomainRegistry } from "./context/DomainContext";
export { DomainProvider, useDomain } from "./context/DomainContext";
export type { LocationSearchResult } from "./data/locationSearch";
export type { LayerDataMap } from "./hooks/useLayerData";
export { useLayerData } from "./hooks/useLayerData";
