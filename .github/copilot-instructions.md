# .github/copilot-instructions.md

This file provides guidance to GitHub Copilot when working with code in this repository.

## What this is

Buffer Zones maps apartheid-era spatial planning legacy in Tshwane/Pretoria: recognized township areas, formal transit routes (Gautrain, Gautrain Bus, A Re Yeng, PRASA), and modeled car drive-time to selected job centers. v1 is scoped to Tshwane only; other metros are scaffolded but stubbed. It is a static, public-interest SPA — no backend, no accounts, no tracking beyond cookieless page views.

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

- **packages/shared** — `constants/townships.ts` holds `TOWNSHIP_AREA_DEFINITIONS`, the single source of truth for which 32 Census 2011 sub-places count as included township areas (see `docs/data/tshwane-area-classification.md` for the selection rules). `types/` defines the GeoJSON/layer contracts (`LayerDefinition`, `TownshipFeature`, `TransitLayerFeatureCollection`) shared by the pipeline (producer) and web (consumer).

- **data-pipeline** — `src/run.ts` orchestrates: fetch boundaries → OSRM drive-time to 8 job centers (`osrmClient.ts`, batched 50 origins/request against the public demo server, 1s delay, retry-on-429) → transit adapters (Overpass API) → nearest-transit-distance join → dissolved township-area boundaries → simplified `.display.v1.geojson` variants → write to `packages/web/public/data/`. **Adding a transit operator/metro**: write one adapter file following `src/adapters/gautrain.ts` or `src/adapters/aReYeng.ts` (a `fetchX()` + `normalizeX()` pair normalizing into `TransitLayerFeatureCollection`), add one entry to `packages/web/src/layers/registry.ts`, re-run the pipeline. No other pipeline or map code should need to change.

- **packages/web** — the layer registry (`layers/registry.ts`, a flat array of `LayerDefinition`) is the single point that drives both map rendering and the layer-toggle UI; `MapView` doesn't need edits to add a layer. State: one Zustand store (`stores/useMapUiStore.ts`) holding only UI state (visible layer ids, basemap, panel/selection state) — never map data. `hooks/useLayerData.ts` lazily fetches GeoJSON per visible layer id (dedupes by ref) via `data/fetchFeatureCollection.ts`, which validates responses against Zod schemas in `data/geoJsonSchemas.ts` before anything reaches a component.

- **Deploy** — Cloudflare Workers serving static assets only (`packages/web/dist`), no bindings/API routes (`wrangler.jsonc`). Full/100 Lighthouse scores and mobile-friendliness are a hard requirement, not aspirational — this drives decisions like the `.display.v1.geojson` simplification step and self-hosted variable fonts.

## Conventions

- **TDD.** Write the failing test before implementation code, for both bug fixes and new features.
- **SOLID, DRY, KISS, YAGNI.** Prefer the simplest design that satisfies current requirements; don't build for hypothetical future needs.
- **No code comments** unless they capture a genuinely non-obvious *why* (a constraint, a workaround, an invariant) — never restate what the code already says.
- **Expanded `if` statements with braces**, never single-line/braceless conditionals. Biome's `useBlockStatements: error` rule enforces this — don't disable it.
- **Accessibility is a priority**, not an afterthought — semantic HTML, keyboard navigation, focus states, and contrast should be considered in every UI change, in step with the Lighthouse-100 bar above.
- **British English spelling and grammar** in all user-facing copy (UI text, labels, error messages) — not in code identifiers.
- Use **superpowers** skills for their intended workflows (brainstorming before creative/design work, TDD, systematic debugging, etc.) rather than working ad hoc.

## Design system

Named CSS custom-property colour tokens (`--color-ink/panel/line/paper/ochre/redearth/muted/surface`, defined in `packages/web/src/index.css` with separate light/dark-mode values), Inter Variable and Martian Mono Variable as the two self-hosted variable fonts, and a recurring hairline-plus-corner-registration-tick motif (`App.module.css`). Keep new UI consistent with this rather than introducing new ad hoc styles or fonts.
