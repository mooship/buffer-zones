# `@stratum/map`

Generic map rendering and UI components (React + Leaflet) for Stratum, built on `@stratum/core`. Has no dependency on `@stratum/app` or `@stratum/web` — components take a `DomainConfig`/`Layer` values via context or props instead of a hardcoded domain.

## What belongs here

- **`DomainProvider({ domain, children })` / `useDomain(): DomainRegistry`** (`context/DomainContext.tsx`) — a React context wrapping `createRegistry` from `@stratum/core`. Any component that calls `useDomain()`, directly or transitively, must be rendered inside a `DomainProvider`; `useDomain()` throws otherwise.
- **`MapView`** — the Leaflet map itself: tile basemap, choropleth and transit overlays resolved from the active `DomainProvider`, township-area-style outline labels, feature selection/keyboard interaction, and location-search fly-to behaviour. Takes a `bounds` prop (no baked-in region bounds) and a `renderFeaturePopup` callback (no hardcoded popup component), so it stays domain-agnostic. An optional `locateOnClick` prop (default `false`) reverse-geocodes a background map click and shows the result in a popup, via the new `ClickToLocatePopup` sub-component. Exported from a dedicated `@stratum/map/MapView` subpath — see below.
- **`Legend`, `DesktopLegend`, `MobileLegend`** — choropleth and transit layer legend entries, resolved from `useDomain()`.
- **`LocationSearchControl`** — a debounced, keyboard-navigable place search box, with a configurable `placeholder` and an optional `provider` (a `GeocoderProvider`), defaulting to `nominatimGeocoderProvider` (OpenStreetMap Nominatim).
- **UI primitives** — `IconButton`, `SegmentedControl`, `ControlButton`, `ThemeToggle`, `BasemapToggle`, `SettingsMenu`.
- **Leaflet-specific utilities** — `constants/basemaps.ts` (an extensible basemap registry: `registerBasemap`, `getBasemapDefinition`, `getRegisteredBasemapIds`, `getBasemapTileSources`, `Basemap`, `BasemapDefinition`; ships `street`/`satellite` raster basemaps and a `voyager` vector basemap rendered via MapLibre GL, lazy-loaded on selection), `constants/mapStyles.ts` (`TOWNSHIP_OUTLINE`), `data/locationSearch.ts` (`fetchLocationSearchResults`, `fetchReverseGeocodeResult`, `nominatimGeocoderProvider`, `GeocoderProvider`, `LocationSearchResult`).

## What doesn't belong here

- Domain-specific components like a township popup or township browser — those read domain-specific properties (`nearestJobCenter`, `commuteMinutes`, …) that don't exist on a generic `Layer`. Pass a `renderFeaturePopup` callback into `MapView` instead.
- Gauteng domain data (`GAUTENG_SPATIAL_LEGACY_DOMAIN`, metros, townships) — see `@stratum/app`.

## `MapView` and code-splitting

`MapView` is **not** re-exported from the package's main entry point (`@stratum/map`) — it pulls in `leaflet` and `react-leaflet`, and apps that lazy-load it to keep that out of their main bundle need a dedicated module boundary. Import it from the `@stratum/map/MapView` subpath:

```tsx
const MapView = lazy(async () => {
  const { MapView } = await import("@stratum/map/MapView");
  return { default: MapView };
});
```

Importing `MapView` (even just its type) from the main `@stratum/map` barrel alongside other components makes it statically reachable from that barrel's whole module graph, which defeats the point of a dynamic `import()` — bundlers will fold it into the main chunk anyway.

## Usage

```tsx
import { DomainProvider, Legend, MapView } from "@stratum/map";
import { GAUTENG_SPATIAL_LEGACY_DOMAIN } from "@stratum/app";

<DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>
  <MapView
    bounds={[[-27.15, 27.1], [-25.3, 28.75]]}
    townships={townships}
    visibleLayerIds={["townships"]}
    renderFeaturePopup={(props) => <MyPopup properties={props} />}
  />
  <Legend mode="active" visibleLayerIds={["townships"]} />
</DomainProvider>;
```
