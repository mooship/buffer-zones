# Regional data split — design

## Problem

`data-pipeline` currently has a single `runNational()` entry point that loops
every metro in `METROS` (all 9 are Gauteng metros/locals today), merges
everything in memory, and writes one output directory:
`packages/web/public/data/national/`. The web app hardcodes
`/data/national` as the base path for all layer fetches.

There is no province concept anywhere in the codebase. Adding a second
province today would mean growing the same merged "national" output and
rerunning the full pipeline (including Gauteng) every time. There's also no
way to add data that is genuinely country-wide, or data that isn't tied to
provincial administrative boundaries at all (e.g. a region spanning parts of
two provinces, or a one-off dataset).

## Goals

- Split output by region so that adding/rebuilding one province never
  requires touching another province's data.
- Support three kinds of region: `province` (metro-driven, built by the
  existing OSRM/boundary pipeline), `national` (genuinely country-wide data),
  and `custom` (region-bound but not tied to a province, or otherwise
  free-standing data) — architecture only, no new `national`/`custom` region
  is populated in this task.
- Keep the web app's rendering behaviour identical: all configured regions'
  layers are fetched and merged into one combined map, with no region
  selector UI.
- No new layer types in this task — only the existing 6 (`townships`,
  `township-areas`, `rapid-rail`, `commuter-rail`, `bus-rapid-transit`,
  `bus`) plus the derived `nearest-transit` layer.

## Non-goals

- Adding a real second province's data.
- Any region picker/filter UI.
- New layer schemas/types.
- Runtime directory discovery — regions are an explicit, typed, static list
  (matching the existing `METROS` pattern), since the Workers app only does
  static client-side fetches and needs exact URLs at build time.

## Design

### `packages/shared`

Add `constants/regions.ts`:

```ts
export type RegionKind = "province" | "national" | "custom";

export interface RegionDefinition {
  id: string;   // slug; output dir is packages/web/public/data/<id>/
  label: string;
  kind: RegionKind;
}

export const REGIONS: RegionDefinition[] = [
  { id: "gauteng", label: "Gauteng", kind: "province" },
];
```

`constants/metros.ts`: each `MetroDefinition` gains a required `regionId`
field. All 9 existing metros get `regionId: "gauteng"`.

### `data-pipeline`

- `run.ts`: replace `runNational()` with `runRegion(regionId: string)`. It
  looks up metros whose `regionId` matches, runs the existing
  fetch/OSRM/merge logic unchanged, and writes to
  `packages/web/public/data/<regionId>/` using the existing staged-dir +
  atomic-rename + `.backup` rollback pattern (parameterized by `regionId`
  instead of the literal `"national"`).
- A `runAllProvinceRegions()` helper iterates every `province`-kind entry in
  `REGIONS` and calls `runRegion` for each — this is what `npm run run`
  invokes with no arguments, preserving today's "just run it" behaviour.
  `national`/`custom` regions are never auto-built by this loop (there are
  none yet, and building them isn't a metro-driven pipeline concern).
- CLI: `npm run run -- --region gauteng` builds one region only.
- `validateOutput.ts` / `outputManifest.ts`: iterate `REGIONS`, skip any
  whose output directory doesn't exist on disk yet (so declaring a
  `national`/`custom` region ahead of populating it doesn't fail
  validation), and validate each existing directory independently instead of
  one hardcoded `OUTPUT_DIR`.

### `packages/web`

- `layers/registry.ts`: for each of the 6 base layer files, build one
  `dataSource` URL per region in `REGIONS`
  (`/data/<regionId>/<file>.display.v1.geojson`), instead of a single
  hardcoded `/data/national/...` path. `getLayerDefinitions()` returns layer
  definitions whose `dataSource` is now `string[]` (one or more URLs) rather
  than a single `string`.
- `hooks/useLayerData.ts`: fetch every URL for a layer, tolerate an
  individual fetch 404ing (a region simply lacking that layer file), and
  merge the returned `FeatureCollection`s by concatenating `features`. If
  every URL fails, surface the existing error state. Cache key changes from
  the literal `` `national:${id}` `` to the layer id plus the sorted list of
  contributing region ids, e.g. `` `${id}:${regionIds.join(",")}` ``.
- No changes to `App.tsx` map rendering — all regions' merged layers render
  as today's single combined view.

### Migration

- `git mv packages/web/public/data/national packages/web/public/data/gauteng`
  (preserves history for the committed GeoJSON/manifest files).
- Update the ~19 files asserting on `/data/national/...` paths or the
  literal string `"national"`:
  - `packages/web/src/layers/registry.test.ts`
  - `packages/web/src/hooks/useLayerData.test.ts`
  - `packages/web/src/components/MapView/MapView.test.tsx`
  - `data-pipeline/src/adapters/boundaries.test.ts`
  - `data-pipeline/src/displayTownships.test.ts`
  - any remaining matches surfaced by `git grep -l national`
- No Playwright e2e changes required (no e2e file references `national`).

## Testing

TDD throughout, per project convention:

- `regions.ts`: exists, contains the `gauteng` province entry.
- `metros.ts`: every metro has a `regionId` of `"gauteng"`.
- `registry.ts`: `getLayerDefinitions()` returns a `dataSource` array with
  one URL per region; with two regions configured (test-only), returns two
  URLs per layer.
- `useLayerData.ts`: merges two mocked region responses into one
  `FeatureCollection`; tolerates one region 404ing and still returns the
  other's features; cache key varies with the region set.
- `validateOutput.ts` / `outputManifest.ts`: validates multiple region
  directories independently; skips a declared-but-absent region without
  failing.
- Update existing pipeline/web tests currently pinned to `/data/national/`.

## Risks / open questions

- `dataSource` becoming `string[]` instead of `string` is a breaking change
  to the `LayerDefinition` shape — all consumers (registry tests,
  `useLayerData`, any place that reads `.dataSource` directly) must be
  updated in the same change.
- Manifest validation per-region duplicates some logic that previously ran
  once; kept simple by validating each directory with the same schema
  rather than introducing per-kind validation rules.
