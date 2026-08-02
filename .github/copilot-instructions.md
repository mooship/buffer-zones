# .github/copilot-instructions.md

This file provides guidance to GitHub Copilot when working with code in this repository.

## What this is

Stratum is a reusable SDK for building public-interest geospatial layer platforms: a domain-agnostic layer model, generic map rendering, and React hooks (`@stratum/core`, `@stratum/map`, `@stratum/react`) that any dataset can be wired into. `packages/app` and `packages/web` are the SDK's reference implementation, not the product — a real, published SSR app on Cloudflare Workers (no accounts, no tracking beyond cookieless page views) that proves the SDK out end-to-end. That implementation's one domain, `gauteng-spatial-legacy`, maps apartheid-era spatial planning legacy across South African metros using one combined regional map layer: recognized township areas, formal transit routes, and modeled car drive-time to selected job centers. That domain's data currently covers the `gauteng` region: all nine Gauteng municipalities, including Tshwane/Pretoria and Johannesburg.

## Commands

```bash
npm install
npm run test        # vitest across the npm workspaces under packages/*
npm run test:coverage # vitest run --coverage, same scope
npm run typecheck   # tsc --noEmit for @stratum/core, @stratum/app, @stratum/map, @stratum/react + web build + data-pipeline typecheck
npm run build       # build all workspaces
npm run lint        # biome check .
npm run format      # biome format --write .
npm run dev --workspace @stratum/web
```

Run a single test file: `npx vitest run path/to/file.test.ts` (or `npx vitest path/to/file.test.ts` to watch).

Playwright end-to-end tests live in `packages/web/e2e/`. They are not part of `npm run test`, and run in CI via a dedicated GitHub Actions workflow (`.github/workflows/playwright.yml`):

```bash
npm run playwright:install --workspace @stratum/web  # once, downloads the Chromium binary
npm run test:e2e                                     # builds packages/web and runs the suite against the production preview server
npm run test:e2e:ui --workspace @stratum/web          # Playwright's interactive UI runner
```

`data-pipeline/` is **not** an npm workspace — it's a standalone project:

```bash
cd data-pipeline
npm install
npm run run       # full pipeline: fetch boundaries/transit, OSRM routing, join, write output
npm run display   # legacy helper: rebuilds compact display files for per-metro source directories when present
```

Pre-commit (lefthook) runs biome (auto-fix staged files) and the full vitest suite — expect both to run on every commit.

## Architecture

**Three parts, one direction of data flow:** `data-pipeline` (offline, run manually) → static GeoJSON committed per-region under `packages/web/public/data/<regionId>/` → `packages/web` (client-side fetch only, no runtime API). `packages/app` is the contract both ends agree on, built on top of the domain-agnostic model in `packages/core`.

- **packages/core** — domain-agnostic layer model (`Layer`, `LayerGroup`, style config types, in `types/layer.ts`), a Leaflet config factory (`createLayerConfig`, converting a `Layer` into Leaflet `pathOptions`/`styleFn`), a registry factory (`createRegistry`, exposing `getLayers`/`getLayer`/`getLayerGroups` over a `DomainConfig`), and geodata utils (`fetchFeatureCollection`, `mergeFeatureCollections`, and the Zod schemas in `geoJsonSchemas.ts` — `featureCollectionSchema`, `polygonGeometrySchema`, `multiPolygonGeometrySchema`, `createFeatureCollectionParser`). Every export is JSDoc-documented. Has no dependency on `packages/app`, `packages/web`, or React — it's the first package extracted towards a reusable SDK.

- **packages/app** (`@stratum/app`) — Gauteng-specific constants (metros, regions, townships, transit layer ids), domain data, and Gauteng-specific GeoJSON type definitions. `types/genericLayer.ts` still re-exports the `Layer`/`LayerGroup` contracts (style config, geometry kind, interaction, grouping/selection mode) from `@stratum/core`, which any domain's layers must satisfy, but `domains/gauteng-spatial-legacy/layers.ts` imports `Layer` directly from `@stratum/core` rather than through that stub. `domains/gauteng-spatial-legacy/` (`layers.ts`, `layerGroups.ts`, `index.ts` exporting `GAUTENG_SPATIAL_LEGACY_DOMAIN`) is the first concrete domain built on those types — it wires up the Gauteng layer catalogue, layer groups, and "why this map exists" story copy (the `rapid-rail` and `commuter-rail` layers set `hasPointGeometry: true`, since real station/stop Point geometry only exists for those two networks). `constants/regions.ts` defines `REGIONS` (currently one entry, `gauteng`, kind `province`), the registry driving per-region output directories and data-fetch URLs. `constants/metros.ts` still defines `METROS` (currently the nine Gauteng municipalities), each tagged with a `regionId`, used by the pipeline while building a region's dataset. `constants/townships.ts` defines included township-area groupings per metro. `types/` also holds Gauteng-specific GeoJSON/transit contracts. Renamed from `packages/shared`/`@stratum/shared`.

- **packages/map** — generic map rendering components (`MapView`, `Legend`, `DesktopLegend`, `MobileLegend`, `LocationSearchControl`, UI primitives `IconButton`/`SegmentedControl`/`ControlButton`/`ThemeToggle`/`BasemapToggle`/`SettingsMenu`), a `DomainProvider` React context plus `useDomain()` hook wrapping `createRegistry` from `@stratum/core`, and Leaflet-specific utilities (`constants/basemaps.ts`, `constants/mapStyles.ts`, `data/locationSearch.ts`). `DomainProvider` must wrap any component tree that calls `useDomain()` — directly (`Legend`, `MapView`) or transitively (`DesktopLegend`, `MobileLegend`); `useDomain()` throws if called outside one. `MapView` takes a domain-agnostic `bounds` prop (no baked-in Gauteng bounds) and a `renderFeaturePopup` callback so popup content stays caller-defined rather than hardcoded to a Gauteng township shape. `hooks/usePrefersDarkMode.ts` and `hooks/useThemePreference.ts` are thin re-export stubs pointing at `@stratum/react`. Built on `@stratum/core` and `@stratum/react`; still has no dependency on `packages/app` or `packages/web`, taking `DomainConfig`/`Layer` values as props/context instead.

- **packages/react** — generic React hooks with no map/domain dependency: `usePrefersDarkMode()` (tracks the OS `prefers-color-scheme: dark` media query) and `useThemePreference()`/`setThemePreference()`/`initTheme(config)` (a `useSyncExternalStore`-backed theme preference store, persisted to `localStorage`, syncing `document.documentElement.dataset.theme` and a `<meta name="theme-color">` override). `initTheme({ storageKey, colors })` must be called once at app bootstrap, before hydration, with app-specific values — the storage key and colour pair are no longer baked into the hook; calling `initTheme` also re-reads the already-stored preference under the new key, since the module's own top-level read (at import time, before `initTheme` can run) used the built-in default config. The third package extracted towards a reusable SDK.

- **data-pipeline** — pipelines are described declaratively as a `RegionPipelineConfig` (`src/pipelineSource.ts`): a `regionId`, the `metros` it covers, and a list of `PipelineSource` entries (`layerId`, `fetch()`, `outputFileName`) each responsible for producing one transit layer's `FeatureCollection`. `src/regions/gautengPipelineConfig.ts` is the first such config, wiring up Gautrain rail/bus, PRASA rail, A Re Yeng, Rea Vaya, Ekurhuleni IRPTN, and Tshwane bus fetchers into `GAUTENG_PIPELINE_CONFIG`. `src/run.ts` runs `runRegion(config)` (looped across every configured region by `runAllProvinceRegions()`, or invoked for a single region via `npm run run -- --region gauteng`): loops through the config's `metros` to fetch boundaries and per-metro OSRM job-center routing, runs each `PipelineSource.fetch()`, computes nearest-transit distance, then writes that region's combined dataset under `packages/web/public/data/<regionId>/` (including `townships`, `township-areas`, and one file per configured transit source, plus `.display.v1.geojson` variants). Only the `gauteng` region exists today.

- **packages/web** — `layers/registry.ts` wraps `createRegistry` from `@stratum/core` around `GAUTENG_SPATIAL_LEGACY_DOMAIN`; there is no metro argument or per-domain selector yet since only one domain is published. `layers/createLayerConfig.ts`, `data/fetchFeatureCollection.ts`, and `data/mergeFeatureCollections.ts` are thin re-export stubs pointing at `@stratum/core`; `data/geoJsonSchemas.ts` re-exports the generic schemas from `@stratum/core` and adds the township-specific `townshipFeatureCollectionSchema`. `components/MapView`, `components/Legend`, `components/DesktopLegend`, `components/MobileLegend`, `components/LocationSearchControl`, and the shared UI primitive components under `components/` are thin re-export stubs pointing at `@stratum/map`; `constants/basemaps.ts` and `data/locationSearch.ts` likewise re-export from `@stratum/map`; `hooks/usePrefersDarkMode.ts` and `hooks/useThemePreference.ts` re-export from `@stratum/react`. `constants/themeConfig.ts` holds the app-specific `THEME_COLOR`/`THEME_STORAGE_KEY` values (the `buffer-zones-theme` storage key predates the Stratum rename and is kept as-is to avoid discarding users' stored preference); `entry.client.tsx` calls `initTheme({ storageKey: THEME_STORAGE_KEY, colors: THEME_COLOR })` before `hydrateRoot`, and `public/theme-bootstrap.js` (a static script, can't import the constant) duplicates the same literal storage key to set `data-theme` pre-hydration and avoid a flash of the wrong theme. `App.tsx` wraps its whole render tree in `<DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>` (both `MapView` and the always/conditionally-rendered `DesktopLegend`/`MobileLegend` need `useDomain()`), passes `MapView` a Gauteng `bounds` constant and a `renderFeaturePopup` that renders `TownshipPopup`, which stays web-local since popup content is domain-specific. Each layer's `dataSource` is a list of URLs built via `buildRegionDataUrls()` and pointing at `/data/<regionId>/*.geojson`, one per region in `REGIONS`. UI state in `stores/useMapUiStore.ts` contains layer visibility, basemap, panel state, and selection only; there is no metro or region selector state. `App.tsx` and `hooks/useLayerData.ts` fetch every region's data and merge the resulting `FeatureCollection`s client-side into one combined map view.

- **Deploy** — Cloudflare Workers runs the wrapper entry (`packages/web/workers/app.ts`) which imports the built React Router server bundle (`packages/web/build/server/index.js`), and serves built client assets from `packages/web/build/client` (`wrangler.jsonc`). Full/100 Lighthouse scores and mobile-friendliness are a hard requirement, not aspirational — this drives decisions like the `.display.v1.geojson` simplification step and self-hosted variable fonts.

- **Testing** — vitest unit/component tests (gated in CI) deliberately mock `react-leaflet`, so real Leaflet rendering, tile requests, and popup/tooltip binding are untested there by design. `packages/web/e2e/` fills that gap with Playwright, run on demand against a production SSR preview (`npm run build && npm run preview --workspace @stratum/web`) with basemap tile requests mocked to a 1x1 PNG so the suite doesn't depend on OSM/CARTO/Esri availability.

## Conventions

- **TDD.** Write the failing test before implementation code, for both bug fixes and new features.
- **SOLID, DRY, KISS, YAGNI.** Prefer the simplest design that satisfies current requirements; don't build for hypothetical future needs.
- **No code comments** unless they capture a genuinely non-obvious *why* (a constraint, a workaround, an invariant) — never restate what the code already says.
- **Expanded `if` statements with braces**, never single-line/braceless conditionals. Biome's `useBlockStatements: error` rule enforces this — don't disable it.
- **Accessibility is a priority**, not an afterthought — semantic HTML, keyboard navigation, focus states, and contrast should be considered in every UI change, in step with the Lighthouse-100 bar above.
- **British English spelling and grammar** in all user-facing copy (UI text, labels, error messages) — not in code identifiers.

## Design system

Named CSS custom-property colour tokens (`--color-ink/panel/line/paper/ochre/redearth/muted/surface`, defined in `packages/web/src/index.css` with separate light/dark-mode values), Inter Variable and Martian Mono Variable as the two self-hosted variable fonts, and a recurring hairline-plus-corner-registration-tick motif (`App.module.css`). Keep new UI consistent with this rather than introducing new ad hoc styles or fonts.
