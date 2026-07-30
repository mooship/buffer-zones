# .github/copilot-instructions.md

This file provides guidance to GitHub Copilot when working with code in this repository.

## What this is

Buffer Zones maps apartheid-era spatial planning legacy across South African metros: recognized township areas, formal transit routes, and modeled car drive-time to selected job centers. Tshwane/Pretoria (Gautrain, Gautrain Bus, A Re Yeng, PRASA) and Johannesburg (Gautrain, PRASA, Rea Vaya) are both fully supported and switchable in the UI; other metros (Cape Town, Durban) are scaffolded but stubbed. It is a static, public-interest SPA — no backend, no accounts, no tracking beyond cookieless page views.

## Commands

```bash
npm install
npm run test        # vitest across all workspaces (packages/*, data-pipeline)
npm run test:coverage # vitest run --coverage, same scope
npm run typecheck   # shared package typecheck + web build + data-pipeline typecheck
npm run build       # build all workspaces
npm run lint        # biome check .
npm run format      # biome format --write .
npm run dev --workspace @buffer-zones/web
```

Run a single test file: `npx vitest run path/to/file.test.ts` (or `npx vitest path/to/file.test.ts` to watch).

Playwright end-to-end tests live in `packages/web/e2e/` and run on demand only — they are **not** part of `npm run test` or CI:

```bash
npm run playwright:install --workspace @buffer-zones/web  # once, downloads the Chromium binary
npm run test:e2e                                          # builds packages/web and runs the suite against the production preview server
npm run test:e2e:ui --workspace @buffer-zones/web          # Playwright's interactive UI runner
```

`data-pipeline/` is **not** an npm workspace — it's a standalone project:

```bash
cd data-pipeline
npm install
npm run run       # full pipeline: fetch boundaries/transit, OSRM routing, join, write output
npm run display   # rebuild only the compact .display.v1.geojson artifacts from committed full-res data
```

Pre-commit (lefthook) runs biome (auto-fix staged files) and the full vitest suite — expect both to run on every commit.

## Architecture

**Three parts, one direction of data flow:** `data-pipeline` (offline, run manually) → static GeoJSON files committed to `packages/web/public/data/` → `packages/web` (client-side fetch only, no API calls at runtime). `packages/shared` is the type/constant contract both ends of the pipeline agree on.

- **packages/shared** — `constants/metros.ts` holds `METROS`, the definition of each supported metro (id, name, `municipalityCode`, map centre/zoom). `constants/townships.ts` holds `TOWNSHIP_AREA_DEFINITIONS`, the single source of truth for which Census 2011 sub-places count as included township areas per metro (60 areas total: 32 Tshwane + 28 Johannesburg; see `docs/data/tshwane-area-classification.md` and `docs/data/johannesburg-area-classification.md` for the selection rules). `types/` defines the GeoJSON/layer contracts (`LayerDefinition`, `TownshipFeature`, `TransitLayerFeatureCollection`) shared by the pipeline (producer) and web (consumer).

- **data-pipeline** — `src/run.ts` loops over every metro in `METROS`, orchestrating per metro: fetch boundaries (filtered by that metro's `municipalityCode`) → OSRM drive-time to that metro's job centers (`osrmClient.ts`, batched 50 origins/request, 1s delay, retry-on-429) → transit adapters (Overpass API, bbox scoped per metro) → nearest-transit-distance join → dissolved township-area boundaries → simplified `.display.v1.geojson` variants → write to `packages/web/public/data/<metroId>/`. Run a single metro with `npm run run -- <metroId>` (useful to avoid re-fetching an already-succeeded metro after a rate-limited retry). Both OSRM and Overpass base URLs are overridable via `OSRM_BASE_URL`/`OVERPASS_URL` env vars (`src/constants/serviceUrls.ts`) for self-hosting; Overpass also automatically rotates across a few public mirrors on repeated 429/504. **Adding a transit operator**: write one adapter file following `src/adapters/gautrain.ts`, `src/adapters/aReYeng.ts`, or `src/adapters/reaVaya.ts` (a `fetchX(bbox)` + `normalizeX()` pair normalizing into `TransitLayerFeatureCollection`), add one entry to `packages/web/src/layers/registry.ts` scoped to the right metro, wire it into the relevant branch of `runMetro()` in `run.ts`, re-run the pipeline. **Adding a metro**: add an entry to `METROS`, a bounding box to `METRO_BBOX`, that metro's job centres to `JOB_CENTERS`, and its township area definitions to `TOWNSHIP_AREA_DEFINITIONS` — `run.ts` picks it up automatically. Not every real-world operator has usable public data — Johannesburg's Metrobus was investigated and deliberately left stubbed (no route geometry anywhere in OSM, no authoritative GIS source found) rather than shipping a misleadingly sparse layer.

- **packages/web** — the layer registry (`layers/registry.ts`, `getLayerDefinitions(metroId)`) is the single point that drives both map rendering and the layer-toggle UI, scoped per metro (e.g. A Re Yeng is only `available` for Tshwane, Rea Vaya only for Johannesburg); `MapView` doesn't need edits to add a layer. State: one Zustand store (`stores/useMapUiStore.ts`) holding only UI state (visible layer ids, current `metroId`, basemap, panel/selection state) — never map data; switching metros resets layer visibility to that metro's defaults and clears the selected township. `hooks/useLayerData.ts` lazily fetches GeoJSON per visible layer id and metro (dedupes by ref, clears and refetches on metro change) via `data/fetchFeatureCollection.ts`, which validates responses against Zod schemas in `data/geoJsonSchemas.ts` before anything reaches a component.

- **Deploy** — Cloudflare Workers serving static assets only (`packages/web/dist`), no bindings/API routes (`wrangler.jsonc`). Full/100 Lighthouse scores and mobile-friendliness are a hard requirement, not aspirational — this drives decisions like the `.display.v1.geojson` simplification step and self-hosted variable fonts.

- **Testing** — vitest unit/component tests (gated in CI) deliberately mock `react-leaflet`, so real Leaflet rendering, tile requests, and popup/tooltip binding are untested there by design. `packages/web/e2e/` fills that gap with Playwright, run on demand against a production preview build (`vite build && vite preview`, not the dev server, to avoid React StrictMode's dev-only double effect invocation) with basemap tile requests mocked to a 1x1 PNG so the suite doesn't depend on OSM/CARTO/Esri availability.

## Conventions

- **TDD.** Write the failing test before implementation code, for both bug fixes and new features.
- **SOLID, DRY, KISS, YAGNI.** Prefer the simplest design that satisfies current requirements; don't build for hypothetical future needs.
- **No code comments** unless they capture a genuinely non-obvious *why* (a constraint, a workaround, an invariant) — never restate what the code already says.
- **Expanded `if` statements with braces**, never single-line/braceless conditionals. Biome's `useBlockStatements: error` rule enforces this — don't disable it.
- **Accessibility is a priority**, not an afterthought — semantic HTML, keyboard navigation, focus states, and contrast should be considered in every UI change, in step with the Lighthouse-100 bar above.
- **British English spelling and grammar** in all user-facing copy (UI text, labels, error messages) — not in code identifiers.

## Design system

Named CSS custom-property colour tokens (`--color-ink/panel/line/paper/ochre/redearth/muted/surface`, defined in `packages/web/src/index.css` with separate light/dark-mode values), Inter Variable and Martian Mono Variable as the two self-hosted variable fonts, and a recurring hairline-plus-corner-registration-tick motif (`App.module.css`). Keep new UI consistent with this rather than introducing new ad hoc styles or fonts.
