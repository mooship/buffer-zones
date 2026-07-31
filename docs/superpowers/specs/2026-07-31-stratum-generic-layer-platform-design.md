# Stratum: generalizing Buffer Zones into a generic geospatial layer platform

**Status:** Approved design, pending implementation plan.
**Rebrand:** Buffer Zones → **Stratum**. New site at `stratum.timothybrits.co.za` (interim; domain/registrar decision deferred).

## 1. Motivation

Buffer Zones currently ships one hardcoded layer set: apartheid-era township boundaries, transit routes, and drive-time-to-jobs data for Gauteng. The goal of this work is to turn the underlying platform into a generic geospatial layer/layer-group renderer and pipeline — "build my own ThinkGeo" — where the current township/transit dataset becomes one example domain among others, addable and removable without touching core code. This is an architecture and rebrand design; it does not change what the current map shows to end users.

## 2. Current-state investigation summary

| Area | File(s) | Verdict |
|---|---|---|
| Region/metro registry | `packages/shared/src/constants/regions.ts`, `metros.ts` | Shape-generic, but `MetroId` is a closed union of 9 hardcoded Gauteng metro names; scope-locked to one province by construction, not by design intent. |
| Township definitions | `packages/shared/src/constants/townships.ts` | ~1000 lines of literal South African census-boundary join data. Deeply domain-specific — this is pipeline/domain logic, not core platform logic, and is **not** targeted for genericization itself. |
| Layer types | `packages/shared/src/types/layer.ts` | `LayerDefinition` shape is close to generic (label/dataSource/style/visibility), but `LayerId` is a closed union of the 6 current layers. No `LayerGroup` concept exists. |
| Layer registry | `packages/web/src/layers/registry.ts`, `createLayerConfig.ts` | Flat hardcoded array of 6 layers. Styling special-cases `propertyKey === "nearestTransitKm"` and calls into township-specific `getTownshipGroup` from what should be a generic styling function. |
| UI state | `packages/web/src/stores/useMapUiStore.ts` | `ACCESS_LAYER_IDS` hardcodes mutual-exclusivity behaviour by literal layer id instead of it being a property of a layer group. `selectedTownshipId` is a domain-specific field. |
| Data fetch/merge | `packages/web/src/hooks/useLayerData.ts` | Genuinely generic already — fetches by `LayerDefinition.dataSource`, no per-layer conditionals. |
| App/map rendering | `packages/web/src/App.tsx`, `components/MapView/MapView.tsx` | Township GeoJSON fetched via a bespoke path parallel to `useLayerData`, not routed through the registry. `MapView` branches on `isChoropleth`/literal ids for rendering, interaction, and labeling. |
| Panel/legend copy | `LayerToggles.tsx`, `Legend.tsx`, `App.tsx` | Layer *names* are data-driven; grouping, section headings, legend colour buckets, and story-panel copy are hardcoded JSX strings. |
| Data pipeline | `data-pipeline/src/run.ts` and adapters | Fetch/normalize/routing/export mechanics are generic. Orchestration branches on literal metro ids (`if (metro.id === "tshwane")`) to select operator adapters; `REQUIRED_TRANSIT_NETWORKS` is a separate hardcoded list. |

Full file-by-file detail with line references is preserved in the session investigation and doesn't need to be duplicated here; the table above is the load-bearing summary for the design below.

## 3. Core abstractions

Three approaches were considered:

1. **Minimal — widen `LayerId` to `string`.** Cheapest, but leaves every styling/rendering/copy special-case in place. Rejected — doesn't satisfy "add a layer without touching core code."
2. **Full plugin runtime** — layer groups as dynamically-loaded modules, discovered at build/runtime. Closer to a true SDK, but overkill for a single-maintainer SSR Cloudflare Workers app, and explicitly ruled out in favour of a config-driven model.
3. **Config-driven generic model (chosen).** `Layer` and `LayerGroup` are interfaces in `packages/shared`; all per-layer behaviour (styling, legend buckets, grouping/exclusivity, interaction, copy) lives as data on the config object. Core rendering/pipeline code only ever reads config, never branches on a specific layer id.

```ts
// packages/shared/src/types/layer.ts — generic core, no domain knowledge

export type FeatureGeometryKind = "choropleth" | "line" | "point";

export interface ColorBucket {
  max: number;            // upper bound this bucket covers
  color: string;
  label: string;           // legend text, e.g. "< 30 min"
}

export interface ChoroplethStyle {
  kind: "choropleth";
  propertyKey: string;     // which feature property drives the fill
  buckets: ColorBucket[];  // legend + colour scale, fully data-driven
}

export interface LineStyle {
  kind: "line";
  color: string;
  weight: number;
  legendLabel: string;
}

export interface PointStyle {
  kind: "point";
  color: string;
  radius: number;
  legendLabel: string;
}

export type LayerStyle = ChoroplethStyle | LineStyle | PointStyle;

export interface LayerInteraction {
  selectable: boolean;
  labelField?: string;      // property to show as a persistent map label
  popupFields?: string[];   // properties to show in a feature popup/tooltip
}

export interface LayerDefinition {
  id: string;               // no longer a closed union
  label: string;
  description?: string;     // free-text copy, rendered generically in UI
  dataSource: readonly string[];
  companionSource?: string; // optional secondary dataset (e.g. aggregated label polygons)
  geometryKind: FeatureGeometryKind;
  defaultVisible: boolean;
  available: boolean;
  style: LayerStyle;
  interaction?: LayerInteraction;
}

export type LayerGroupSelectionMode = "exclusive" | "independent";

export interface LayerGroupDefinition {
  id: string;
  title: string;             // e.g. "Access to opportunity"
  description?: string;      // e.g. "Only one overlay can be active at a time"
  selectionMode: LayerGroupSelectionMode;
  layerIds: string[];
}
```

Key moves versus today:
- `ChoroplethStyle.buckets` replaces the hardcoded `ENTRIES`/`TRANSIT_DISTANCE_ENTRIES` in `Legend.tsx` — the legend becomes a pure function of `LayerDefinition.style`.
- `LayerGroupDefinition.selectionMode` replaces `ACCESS_LAYER_IDS` — exclusivity is a property of the group, not a hardcoded id array in the Zustand store.
- `LayerInteraction` replaces bespoke `bindTownshipFeatureInteractions`/`TownshipSelection` — any `selectable` layer with a `labelField` gets the same generic click-to-select + label behaviour `MapView.tsx` currently wires up only for townships.
- `description` is the generic copy field the UI reads instead of literal JSX strings.
- `companionSource` lets a layer declare a secondary dataset (e.g. township fine boundaries + aggregated label polygons) so `App.tsx`'s bespoke parallel fetch path folds into `useLayerData`.

`townships.ts`'s census-join logic and the property types in `types/township.ts`/`types/transit.ts` are **not** genericized — they're domain-side logic that a `gauteng-spatial-legacy` domain package owns, same as any future domain would own its own property types.

## 4. Migration plan (existing layers → generic model, zero regression)

Test-first at every phase, per this repo's TDD convention.

1. **Add new types alongside old ones.** New `LayerDefinition`/`LayerGroupDefinition`/`LayerStyle` shapes land in `packages/shared`. Unit tests assert the shapes validate/round-trip correctly.
2. **Reimplement today's 6 layers as data** in a new `packages/shared/src/domains/gauteng-spatial-legacy/` module: `LAYER_DEFINITIONS` (townships, nearest-transit, rapid-rail, bus-rapid-transit, commuter-rail, bus) and `LAYER_GROUPS` (`access-to-opportunity` exclusive group; `transit-networks` independent group), with `description` copy migrated from hardcoded JSX strings. Tests snapshot every existing layer id/style/bucket value against current hardcoded values — the regression safety net.
3. **Refactor core rendering to be generic**, one TDD cycle per special-case removed: `createLayerConfig.ts` → pure `styleFor(layer.style)`; `MapView.tsx` → dispatch on `geometryKind`/`interaction`, not literal ids; `useMapUiStore.ts` → exclusivity resolved via the layer's group `selectionMode`; `Legend.tsx`/`LayerToggles.tsx` → render from group/layer config, no hardcoded copy.
4. **Fold `App.tsx`'s bespoke township fetch into `useLayerData`** via `companionSource`.
5. **Delete old hardcoded types/arrays** (`LayerId` union, `ACCESS_LAYER_IDS`, `ENTRIES`/`TRANSIT_DISTANCE_ENTRIES`, `PANEL_LABELS`) once nothing references them. `townships.ts`/`transitLayers.ts` census logic stays as-is — it's pipeline/domain-side, not core.
6. **Regression gate:** existing e2e specs (`layer-toggles.spec.ts`, `township-browser.spec.ts`, etc.) are updated to exercise the new generic config but must keep asserting identical user-visible behaviour — same toggle labels, same exclusivity, same legend buckets.

## 5. Ingestion pipeline proposal

Fetch/normalize/routing/export mechanics in `data-pipeline` are already generic; orchestration is not. The fix is a `PipelineSource`/`RegionPipelineConfig` registry that replaces literal metro-id branching in `run.ts`, while leaving domain-specific adapter code (Gautrain, PRASA, A Re Yeng, etc.) untouched and owned by the domain.

```ts
// data-pipeline/src/pipelineSource.ts
export interface PipelineSource {
  layerId: string;                        // matches shared LayerDefinition.id
  regionId: string;
  fetch(): Promise<FeatureCollection>;     // wraps an existing adapter
  outputFileName: string;                  // e.g. "rapid-rail.geojson"
}

export interface RegionPipelineConfig {
  regionId: string;
  metros: MetroDefinition[];
  sources: PipelineSource[];               // one entry per layer this region produces
  join?: (ctx: PipelineContext) => Promise<void>; // e.g. township+drive-time+transit-distance join
}
```

- `run.ts` becomes `for (const region of REGION_PIPELINE_CONFIGS) { runRegion(region) }` — no `if (metro.id === "tshwane")` branching in orchestration.
- The Gauteng join (township + drive-time + nearest-transit) becomes the `join` hook on the `gauteng-spatial-legacy` `RegionPipelineConfig` — bespoke, but no longer entangled with generic orchestration.
- `constants/jobCenters.ts`, `metroBbox.ts`, `townships.ts`, and the 6 operator adapters move under (or stay referenced by) the `gauteng-spatial-legacy` domain config, internals unchanged.
- `outputManifest.ts`'s `REQUIRED_TRANSIT_NETWORKS` is derived from `RegionPipelineConfig.sources` rather than maintained as a separate literal list.
- Output format/manifest structure is free to change (confirmed) — the pipeline doesn't need to preserve today's exact file layout, since it will regenerate the Gauteng dataset under the new pipeline anyway.
- A new domain/region supplies its own `sources`/adapters/`join` and registers a new `RegionPipelineConfig` — zero lines touched in `run.ts`.

## 6. UI restructure

- **`LayerToggles.tsx`** renders `LayerGroupDefinition[]` generically: per group, render `title`/`description`, then its layers as a single-select (exclusive) or independent checkboxes — replaces the hardcoded choropleth-vs-not split.
- **`Legend.tsx`** renders purely from the visible layer's `style`: choropleth → `buckets`, line/point → `legendLabel`/color/weight. No more literal-id gating or hardcoded bucket arrays.
- **`MapView.tsx`** dispatches on `geometryKind` (3-way) and `interaction` (selectable + labelField), not literal ids — a new choropleth layer with `selectable: true, labelField: "name"` gets label+click behaviour for free.
- **Copy/metadata** moves out of hardcoded JSX into domain config: `description` on `Layer`/`LayerGroup`, plus a top-level `domainConfig.story: { title, body }` for the "why this map exists" panel content, read generically by the panel component. Copy is **data-driven, sourced from the active domain config**, never hardcoded in shared components.
- Net effect: `packages/web` components become pure renderers of `LayerDefinition`/`LayerGroupDefinition`/domain `story` config. `gauteng-spatial-legacy` is the only place SA-specific copy, styling values, and grouping choices live.

## 7. Rebrand

**Chosen name: Stratum.** Reasoning: geological/social-layering metaphor honours the township-legacy origin (enforced spatial separation, read as literal strata) while reading, cold, as "a platform for layered geospatial data" — the ThinkGeo-style repositioning the product needs. Runner-up candidates considered: Palimpsest (more literary, harder to spell), Substrate (more infrastructure-coded), Contour, Groundwork (more literal/approachable, less distinctive).

Interim domain: `stratum.timothybrits.co.za`. Final registrar/TLD decision deferred to a later, separate task — out of scope for this design.

## 8. Explicitly out of scope

- Any second real domain/layer-group beyond the migrated Gauteng dataset (no concrete next use case was specified; the design targets general extensibility without over-fitting to a hypothetical).
- True dynamic/runtime plugin loading (config-driven TS was chosen over a plugin runtime).
- Byte-compatibility of pipeline output with the current `packages/web/public/data/gauteng/` files (confirmed free to change).
- Final domain/registrar choice beyond the interim `stratum.timothybrits.co.za`.
