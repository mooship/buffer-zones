# Stratum: multi-domain platform ("ThinkGeo Lite")

**Status:** Approved design, pending implementation plan.
**Builds on:** `2026-07-31-stratum-generic-layer-platform-design.md` (generic `Layer`/`LayerGroup` model — implemented, see `git log` `a9c683e`..`912f1f5`). That design's Section 8 flagged "multiple simultaneous unrelated domains" as future roadmap and Section 9 explicitly scoped out a second domain. This is that next phase.

## 1. Motivation

The employer evaluating Stratum for acquisition needs two things the current single-domain deployment can't yet demonstrate: (a) a codebase that reads as a platform to a buyer's engineers doing due diligence, not a one-off apartheid-data site with generic types bolted on; (b) a live second domain proving the architecture actually supports unrelated datasets, not just one dataset re-typed.

## 2. Current-state gaps (post generic-layer migration)

Confirmed by direct file audit:

| Area | File(s) | Gap |
|---|---|---|
| Domain selection | `packages/web/src/layers/registry.ts` | Hardcoded to `GAUTENG_SPATIAL_LEGACY_DOMAIN.layers` — no domain registry/selector exists. |
| App shell | `packages/web/src/App.tsx` | Imports `GAUTENG_SPATIAL_LEGACY_DOMAIN` directly for story copy; retains a parallel township-fetch path alongside `useLayerData` instead of routing through it; panel tabs hardcode `["story","places","layers"]`. |
| Places browser | `TownshipBrowser`, `TownshipPopup` | Modeled on townships specifically (grouping, naming, copy), not a generic named-feature browser — can't serve a domain with a different "places" concept. |
| Domain↔region link | `constants/regions.ts`, domain packages | No explicit association; implicit via each domain's own `dataUrl()` calls. |
| Second domain | n/a | Doesn't exist. |

`genericLayer.ts` (types), `useLayerData.ts`, `useMapUiStore.ts`, and `data-pipeline/src/pipelineSource.ts`/`run.ts` are already generic and need no rework — confirmed by audit.

## 3. Domain registry and routing

**Approach:** a `DOMAINS` registry in `packages/shared` (`constants/domains.ts`), shape `{id, regionId, label}[]`, mirroring `REGIONS`. Each domain package keeps its existing shape (`layers`, `layerGroups`, `story`).

`packages/web` adds a domain route segment (React Router, SSR'd) — e.g. `/d/gauteng-spatial-legacy`, `/d/gauteng-socioeconomic` — replacing the hardcoded import in `registry.ts` with `getDomain(domainId)` resolved from the route param. A nav-level domain switcher (built to the same accessibility bar as the rest of the shell: full keyboard support, `aria-current` on the active domain, real links so it works with JS disabled) sits alongside the existing basemap/panel controls.

**Rejected alternative:** client-only state switch with no route change — weaker as an acquisition demo (hides the multi-domain nature from the URL/a shared link), and out of step with the app's static-first, no-runtime-API architecture.

**Required cleanup (part of this phase, not deferred):**
- `App.tsx`: drop the direct domain import and the parallel township-fetch path; all data flows through `useLayerData`, keyed by the active domain from the route.
- `TownshipBrowser`/`TownshipPopup` generalize into `FeatureBrowser`/`FeaturePopup`, driven by a new `browsable: {groupField, labelField, searchable}` config added to `Layer` (alongside the existing `interaction.popupFields`) — not townships-specific props. The Gauteng domain configures `browsable` on its township layer; the socioeconomic domain can opt any layer into the same browser.
- `Legend`/`StoryPanel` already read from layer/domain config per the prior migration — confirmed no changes needed beyond keying off the active domain.

## 4. Second domain: `gauteng-socioeconomic`

**Approach:** reuse the municipal boundary polygons the pipeline already fetches for the nine Gauteng metros; add a new `PipelineSource` that fetches/joins published municipal-level statistics as choropleth properties on those same boundaries. No new geometry fetching required. Primary source: Stats SA municipal-level published statistics (unemployment, household income bands); fallback if a needed figure isn't published at municipal granularity there: GCRO Quality of Life Survey. The implementation plan confirms exact field availability against both sources before data-pipeline work starts, since this is a data-availability check rather than a design decision.

Layers: income-band choropleth, unemployment-rate choropleth, service-access choropleth (reusing the existing OSRM drive-time machinery against a different destination set — clinics/schools instead of job centers). Story copy frames this as the present-day counterpart to the historical spatial-legacy domain: same region, paired lens — the concrete "this is a platform" signal for a buyer.

This fits `PipelineSource`'s existing contract (`layerId`, `fetch()`, `outputFileName`) with zero changes to pipeline orchestration; it's a new `RegionPipelineConfig` entry’s `sources` list, same as any other domain would register.

**Rejected alternative:** ward-level geometry for richer granularity — deferred; requires sourcing/licensing new boundary data disproportionate to a first proof-of-concept domain. Candidate fast-follow once the architecture is proven.

## 5. UI/UX bar

Per explicit requirement, the new generic components are held to the same polish bar as existing UI, not a lesser "generic version": keyboard-navigable `FeatureBrowser` (arrow keys, type-ahead search), visible focus states, semantic list markup, hairline/registration-tick motif preserved, Playwright e2e coverage for the domain switcher and `FeatureBrowser` (extending the existing `packages/web/e2e/` pattern), and a Lighthouse pass on both domain routes before merge — not a follow-up task.

## 6. Explicitly out of scope

- A domain outside Gauteng (new region/boundary source) — candidate fast-follow, not this phase.
- Ward-level socioeconomic geometry (Section 4).
- Per-domain visual theming — confirmed: one shared design system/palette across all domains; only layer legend colours (data-driven) and story copy vary.
- Public/third-party domain contribution tooling, embeddable widget/SDK — carried over from the prior design's future-roadmap section, still not this phase.
