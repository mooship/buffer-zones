# SDK Extraction — Design Spec

**Date:** 2026-08-02  
**Status:** Approved

## Goal

Extract the generic, domain-agnostic parts of the Karta codebase into standalone, publishable packages so the mapping SDK can be reused independently. The current app (`packages/web`) becomes a showcase built on top of the SDK. Behaviour must be identical after the refactor — this is a structural change only.

---

## Target Package Layout

```
packages/
  core/     @karta/core   — domain-agnostic layer model + geodata utils
  map/      @karta/map    — generic map rendering + UI primitives (React + Leaflet)
  react/    @karta/react  — generic React hooks
  app/      @karta/app    — Gauteng-specific constants/domain data (rename of shared)
  web/      @karta/web    — the app itself, consuming the four packages above
```

`data-pipeline/` remains standalone and will import from `@karta/app` instead of `@karta/shared`.

---

## Architecture and Data Flow

```
data-pipeline  →  @karta/app  →  @karta/web
                       ↓
              @karta/core  ←  @karta/map  ←  @karta/react
```

### Dependency matrix

| Package | Depends on |
|---|---|
| `@karta/core` | nothing (pure TS, no React, no Leaflet) |
| `@karta/map` | `@karta/core`, leaflet, react-leaflet |
| `@karta/react` | react only |
| `@karta/app` | `@karta/core` |
| `@karta/web` | all four above |

---

## Task 1 — `@karta/core`

**What moves here:**

| Source | Destination |
|---|---|
| `packages/shared/src/types/genericLayer.ts` | `packages/core/src/types/layer.ts` |
| `packages/web/src/layers/createLayerConfig.ts` | `packages/core/src/layers/createLayerConfig.ts` |
| `packages/web/src/data/fetchFeatureCollection.ts` | `packages/core/src/data/fetchFeatureCollection.ts` |
| `packages/web/src/data/mergeFeatureCollections.ts` | `packages/core/src/data/mergeFeatureCollections.ts` |
| Generic schemas from `packages/web/src/data/geoJsonSchemas.ts` | `packages/core/src/data/geoJsonSchemas.ts` |

**geoJsonSchemas.ts split:**  
The generic half — `featureCollectionSchema`, `geometrySchema`, all intermediate geometry schemas, `FeatureCollectionSchema` interface, `FeatureCollectionParser` type, and `createFeatureCollectionParser` — moves to `@karta/core`.  
The township-specific half — `townshipPropertiesSchema` and `townshipFeatureCollectionSchema` — stays in `packages/web/src/data/geoJsonSchemas.ts` alongside `TownshipDataRepository`, their only consumer.

**Layer type addition:**  
Add `hasPointGeometry?: boolean` to the `Layer` interface. This replaces the hardcoded `STATION_LAYER_IDS` list in `packages/web/src/constants/layerStyles.ts`. The Legend will use this field to decide whether to render a dot icon alongside a line swatch.

**Registry genericisation:**  
`packages/web/src/layers/registry.ts` currently returns `GAUTENG_SPATIAL_LEGACY_DOMAIN` directly. After Task 1 it is rewritten to be a pure factory:

```ts
// @karta/core
export interface DomainConfig {
  layers: readonly Layer[];
  layerGroups: readonly LayerGroup[];
}

export function createRegistry(domain: DomainConfig) {
  return {
    getLayers: (): readonly Layer[] => domain.layers,
    getLayer: (id: string): Layer | undefined =>
      domain.layers.find((l) => l.id === id),
    getLayerGroups: (): readonly LayerGroup[] => domain.layerGroups,
  };
}
```

`packages/web/src/layers/registry.ts` is updated to call `createRegistry(GAUTENG_SPATIAL_LEGACY_DOMAIN)` and re-export the same `getLayers` / `getLayer` / `getLayerGroups` signatures — existing call-sites in web are unaffected until Task 5.

**Package setup:**
- `packages/core/package.json` — name `@karta/core`, private, no deps beyond `@types/geojson` as devDep, `@types/leaflet` as devDep (for `LeafletLayerConfig` types in `createLayerConfig`)
- `packages/core/tsconfig.json` extending `tsconfig.base.json`
- `packages/core/vitest.config.ts` mirroring the shared package config

**JSDoc requirement:** Every exported function, type, and interface gets JSDoc as part of this task (see [JSDoc strategy](#jsdoc-strategy)).

**Tests (TDD):**  
Existing tests from `createLayerConfig.test.ts`, `fetchFeatureCollection.test.ts`, `mergeFeatureCollections.test.ts`, `geoJsonSchemas.test.ts` move to core and are updated to import from `@karta/core`. New tests cover `createRegistry` and the `hasPointGeometry` field behaviour.

**Doc updates (part of this task's definition of done):**  
Update CLAUDE.md and `.github/copilot-instructions.md` to reflect the new `@karta/core` package and the fact that generic types live there, not in `@karta/shared`.

---

## Task 2 — `@karta/map`

**What moves here:**

| Source | Destination |
|---|---|
| `packages/web/src/components/MapView/` | `packages/map/src/components/MapView/` |
| `packages/web/src/components/LocationSearchControl/` | `packages/map/src/components/LocationSearchControl/` |
| `packages/web/src/data/locationSearch.ts` | `packages/map/src/data/locationSearch.ts` |
| `packages/web/src/components/Legend/` | `packages/map/src/components/Legend/` |
| `packages/web/src/components/DesktopLegend/` | `packages/map/src/components/DesktopLegend/` |
| `packages/web/src/components/MobileLegend/` | `packages/map/src/components/MobileLegend/` |
| `packages/web/src/components/IconButton/` | `packages/map/src/components/IconButton/` |
| `packages/web/src/components/SegmentedControl/` | `packages/map/src/components/SegmentedControl/` |
| `packages/web/src/components/ControlButton/` | `packages/map/src/components/ControlButton/` |
| `packages/web/src/components/ThemeToggle/` | `packages/map/src/components/ThemeToggle/` |
| `packages/web/src/components/BasemapToggle/` | `packages/map/src/components/BasemapToggle/` |
| `packages/web/src/components/SettingsMenu/` | `packages/map/src/components/SettingsMenu/` |
| `packages/web/src/constants/basemaps.ts` | `packages/map/src/constants/basemaps.ts` |

**Stays in `packages/web`:**  
`TownshipBrowser`, `TownshipPopup`, `EvidenceSummary`, `LayerToggles`. (LayerToggles is a candidate for a future move once the context pattern is proven, but is out of scope here.)

### DomainProvider context

```ts
// @karta/map
export interface DomainRegistry {
  getLayers(): readonly Layer[];
  getLayer(id: string): Layer | undefined;
  getLayerGroups(): readonly LayerGroup[];
}

export const DomainContext = createContext<DomainRegistry | null>(null);

export function DomainProvider({
  domain,
  children,
}: {
  domain: DomainConfig;
  children: ReactNode;
}) {
  const registry = useMemo(() => createRegistry(domain), [domain]);
  return (
    <DomainContext value={registry}>{children}</DomainContext>
  );
}

export function useDomain(): DomainRegistry {
  const registry = useContext(DomainContext);
  if (!registry) throw new Error("useDomain must be used inside DomainProvider");
  return registry;
}
```

`packages/web` wraps its app root in `<DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>`.

### MapView genericisation

Changes from the current `MapView.tsx`:

1. `GAUTENG_BOUNDS` constant removed → required `bounds: [[number, number], [number, number]]` prop
2. `TownshipPopup` import removed → `renderFeaturePopup?: (properties: TProperties) => ReactNode` prop; defaults to no popup if omitted
3. `TownshipFeature` / `TownshipProperties` → generic `<TProperties extends Record<string, unknown> = Record<string, unknown>>`
4. `getLayers()` direct call → `useDomain().getLayers()` from context
5. All zoom-based label visibility, retina tile handling, pane setup, responsive bounds logic, and tile fallback — unchanged (genuinely generic map behaviour)

`packages/web` passes:
- `bounds={GAUTENG_BOUNDS}`
- `renderFeaturePopup={(props) => <TownshipPopup properties={props as TownshipProperties} />}`

### Legend genericisation

- `getLayers()` call → `useDomain().getLayers()` from context
- `STATION_LAYER_IDS` import removed → replaced by `layer.hasPointGeometry === true` check
- All three components (Legend, DesktopLegend, MobileLegend) move together; their CSS modules move with them

### LocationSearchControl

- `locationSearch.ts` moves with the component (Nominatim — fully domain-agnostic)
- Hardcoded placeholder `"Search town, suburb or station"` → `placeholder?: string` prop, default `"Search for a place"`. `packages/web` passes its own placeholder.

**Package setup:**
- `packages/map/package.json` — name `@karta/map`, deps: `@karta/core`, `leaflet`, `react-leaflet`, `lucide-react`, `react`
- CSS modules and any component-specific assets are bundled with the package

**JSDoc requirement:** All exported components, props interfaces, and the `DomainProvider` / `useDomain` / `createRegistry` API.

**Tests (TDD):**  
Existing component tests move to `packages/map/`. New tests:
- `MapView`: `bounds` prop used correctly, `renderFeaturePopup` called with feature properties, no popup rendered when omitted, `useDomain()` provides layers
- `Legend`: `hasPointGeometry` controls dot icon rendering, reads layers from context
- `DomainProvider` / `useDomain`: throws outside provider, returns correct registry inside

**Doc updates (part of this task's definition of done):**  
Update CLAUDE.md and `.github/copilot-instructions.md` to describe `@karta/map` and the `DomainProvider` pattern.

---

## Task 3 — `@karta/react`

**What moves here:**

| Source | Destination |
|---|---|
| `packages/web/src/hooks/usePrefersDarkMode.ts` | `packages/react/src/hooks/usePrefersDarkMode.ts` |
| `packages/web/src/hooks/useThemePreference.ts` | `packages/react/src/hooks/useThemePreference.ts` |

### useThemePreference API change

The current implementation has two app-specific values baked in:
- `THEME_STORAGE_KEY = "buffer-zones-theme"` (the old app name)
- `THEME_COLOR = { light: "#edeff2", dark: "#23262c" }` (app-specific token values)

These become configurable via a one-time init call:

```ts
// @karta/react
export interface ThemeConfig {
  storageKey: string;
  colors: { light: string; dark: string };
}

export function initTheme(config: ThemeConfig): void
export function useThemePreference(): ThemePreference
export function setThemePreference(preference: ThemePreference): void
```

`packages/web` calls `initTheme({ storageKey: 'karta-theme', colors: THEME_COLOR })` once at app bootstrap (e.g. in `root.tsx` or `entry.client.tsx`), before any component mounts.

If `useThemePreference` is called before `initTheme`, it falls back to `{ storageKey: 'karta-theme', colors: { light: '#ffffff', dark: '#000000' } }` with a console warning in development.

**Package setup:**
- `packages/react/package.json` — name `@karta/react`, peerDep: `react`, dep: `usehooks-ts`
- `packages/react/tsconfig.json` extending `tsconfig.base.json`

**JSDoc requirement:** Both hooks and `initTheme` / `setThemePreference`.

**Tests (TDD):**  
Existing hook tests move to `packages/react/`. New tests:
- `initTheme`: setting storageKey changes which localStorage key is read/written
- `useThemePreference`: returns `"system"` before `initTheme` is called (fallback)

**Doc updates:** CLAUDE.md updated to describe `@karta/react`.

---

## Task 4 — `@karta/app` (rename of `packages/shared`)

**What stays / moves:**

Everything currently in `packages/shared` except `types/genericLayer.ts` (already moved to core in Task 1):

- `constants/metros.ts`
- `constants/regions.ts`
- `constants/townships.ts`
- `constants/transitLayers.ts`
- `types/township.ts`
- `types/transit.ts`
- `domains/gauteng-spatial-legacy/` (layers, layerGroups, index)

**`hasPointGeometry` update:**  
In `domains/gauteng-spatial-legacy/layers.ts`, add `hasPointGeometry: true` to the `rapid-rail` and `commuter-rail` layer definitions (these are the two layers that currently appear in `STATION_LAYER_IDS`).

**Package rename:**
- Directory: `packages/shared/` → `packages/app/`
- `package.json` name: `@karta/shared` → `@karta/app`
- Root `package.json` workspaces list updated
- `data-pipeline` `package.json` dependency updated from `@karta/shared` to `@karta/app`

All existing `@karta/shared` tests pass unchanged — the data hasn't changed.

**Doc updates:** All references to `packages/shared` and `@karta/shared` in CLAUDE.md, `.github/copilot-instructions.md`, and `docs/` updated to `packages/app` / `@karta/app`.

---

## Task 5 — `packages/web` import updates

Update all import paths in `packages/web/src/` to pull from the new packages:

| Old import | New import |
|---|---|
| `@karta/shared` | `@karta/app` (domain/Gauteng data) or `@karta/core` (Layer types) |
| `../../layers/createLayerConfig` | `@karta/core` |
| `../../data/fetchFeatureCollection` | `@karta/core` |
| `../../data/mergeFeatureCollections` | `@karta/core` |
| `../../data/geoJsonSchemas` (generic schemas) | `@karta/core` |
| `../../hooks/usePrefersDarkMode` | `@karta/react` |
| `../../hooks/useThemePreference` | `@karta/react` |
| `../../components/MapView/MapView` | `@karta/map` |
| `../../components/Legend/*` | `@karta/map` |
| `../../components/LocationSearchControl/*` | `@karta/map` |
| UI primitives (`IconButton`, etc.) | `@karta/map` |

**Wire-up changes:**

- Wrap app root in `<DomainProvider domain={GAUTENG_SPATIAL_LEGACY_DOMAIN}>`
- Pass `bounds={GAUTENG_BOUNDS}` to `MapView`
- Pass `renderFeaturePopup={(props) => <TownshipPopup properties={props as TownshipProperties} />}` to `MapView`
- Pass `placeholder="Search town, suburb or station"` to `LocationSearchControl`
- Call `initTheme({ storageKey: 'karta-theme', colors: THEME_COLOR })` at app bootstrap

**`packages/web` dependency update:**  
`package.json` dependencies updated from `"@karta/shared": "file:../shared"` to:
```json
"@karta/core": "file:../core",
"@karta/map": "file:../map",
"@karta/react": "file:../react",
"@karta/app": "file:../app"
```

**Success criteria:**
- `npm run test` passes across all workspaces without modification to test logic (import path updates only)
- `npm run typecheck` passes
- `npm run build` produces an identical build artefact
- No test deleted, no assertion weakened

---

## Final Documentation Pass (after all 5 tasks)

- `packages/core/README.md` — what belongs (domain-agnostic types, pure data utils), what doesn't (React, Leaflet, Gauteng data)
- `packages/map/README.md` — what belongs (map UI, DomainProvider, generic primitives), what doesn't (township-specific components)
- `packages/react/README.md` — what belongs (generic React hooks), what doesn't (Leaflet, domain data, app-specific config)
- `packages/app/README.md` — what belongs (Gauteng domain config, metros, regions), what doesn't (generic types, map components)
- Root `README.md` — Documentation and Stack sections updated
- `CONTRIBUTING.md` project structure section updated
- `ATTRIBUTIONS.md` — only if new runtime deps added
- Full repo grep for `packages/shared`, `@karta/shared` in comments/docs — fix or flag

---

## Ambiguous Component — LayerToggles

`LayerToggles.tsx` renders the layer/group toggle controls and calls `getLayers()` / `getLayerGroups()` from the registry. Once the `DomainProvider` context exists, it is a straightforward candidate for genericisation and extraction to `@karta/map`. It is intentionally left in `packages/web` for this refactor. A follow-up task to move it is recommended once Tasks 1–5 are stable.

---

## JSDoc Strategy

Applies to `@karta/core`, `@karta/map`, and `@karta/react` only.

**Functions:** `/** description */` + `@param` per parameter + `@returns`, including edge-case behaviour:
- `createLayerConfig`: document that an unrecognised `style.kind` would be caught at the TypeScript type level (exhaustive switch), so no runtime fallback is needed
- `fetchFeatureCollection`: document that it throws `Error` on a non-ok HTTP response, and that the schema parse failure also throws with a formatted message including the URL
- `createFeatureCollectionParser`: document that it slices to the first 3 validation issues in the error message

**Types/interfaces:** Doc comment on the type, plus inline comments on non-obvious fields:
- `Layer.companionSource`: what it is and when it's used
- `Layer.hasPointGeometry`: that it controls legend dot rendering in `@karta/map`
- `ChoroplethLayerStyle.resolveEmphasis`: why the parameter is typed as `null | undefined`

**React components:** Doc comment on the component + JSDoc on each prop in its props interface, noting required vs optional and defaulting behaviour:
- `MapView`: call out that `renderFeaturePopup` defaults to no popup, `bounds` is required
- `DomainProvider`: call out that it must wrap any component that calls `useDomain()`
- `LocationSearchControl`: call out `placeholder` default value

**`@example` on main entry points:** At minimum `MapView`, `createLayerConfig`, and `DomainProvider`.

**Format:** TSDoc-compatible (`@param`, `@returns`, `@example`, `@remarks`).

**Enforcement:** Subagents must read the implementation before documenting edge cases — no invented behaviour. Flag genuine ambiguity rather than guess.

---

## Execution Model

- One subagent per task, briefed with only that task's plan section and relevant tests
- TDD: failing tests written first, implementation second
- Code-review pass after each task before moving to the next
- Git commit after each task so changes are reviewable incrementally
- No test deleted or weakened to make a task pass — fix the code instead
