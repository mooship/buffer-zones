# Buffer Zones v1 — Design

Date: 2026-07-27
Status: Approved
Supersedes-for-v1: `SPEC.md` (the full multi-metro, AI-chat-enabled vision remains the long-term spec at repo root; this document scopes what v1 actually builds and why it diverges)

## 1. Purpose

Ship a real, working version of Buffer Zones — a map that visualizes apartheid-era spatial planning's effect on commute times in a South African city — scoped to what's actually buildable in this environment and session, using real data rather than placeholders. **v1 targets Pretoria/Tshwane** (the user's hometown), not Cape Town.

## 2. Deltas from SPEC.md (and why)

| SPEC.md says | v1 does instead | Why |
|---|---|---|
| 4 metros, 7 transit operators | Tshwane (Pretoria) only; other operators scaffolded but empty | One metro done for real beats four done thinly. Adapter/registry extensibility (SPEC §11) is still validated by scaffolding the rest. Pretoria chosen over the spec's Cape Town example at the user's request. |
| Local OSRM via Docker | Public `router.project-osrm.org` `/table` endpoint | No Docker available in this environment (no admin/WSL2/reboot path without stopping mid-session); public OSRM was already SPEC's own implicit fallback territory. Rate-limited, so the pipeline batches/delays requests. |
| Shapefile→GeoJSON via `ogr2ogr` (GDAL) | Prefer Adrian Frith's already-GeoJSON Tshwane sub-place data; fall back to npm `shapefile` + `@turf/turf` only if needed | No system GDAL installed; installing it isn't necessary since the pipeline is Node/TS already (SPEC §3) and a pure-JS path avoids a new system dependency entirely. |
| `/api/chat` AI data-chat feature (SPEC §16), `packages/api` workspace | Removed entirely | Explicit user decision — app is 100% static, no backend, no Workers AI binding, no chat UI, no chat-related CSP/privacy text. |
| Unemployment choropleth (SPEC §7) | Included only if a real, cleanly-attributable Stats SA ward-level Tshwane download is found; otherwise ships as a clearly-labeled empty/"data not yet available" state | Non-goal is fabricating numbers to fill a UI slot (SPEC §8: "not aiming for real-time accuracy" — but that's about accuracy, not fabrication). |
| Deploy via `wrangler deploy` (SPEC §5) | Code and config built, deploy not run | No Cloudflare login assumed in this environment/session. |

Everything else in SPEC.md (architecture table minus the AI row, frontend interactions, testing approach, caching strategy, license, design patterns, code conventions, layer extensibility, attributions, privacy, security headers) applies unchanged to v1.

## 3. Repository structure (v1)

```
/
├── package.json          # workspace root, shared devDeps (Biome, TS, Vitest, Lefthook)
├── biome.jsonc
├── lefthook.yml
├── wrangler.jsonc        # static assets only — no /api route
├── LICENSE               # AGPL-3.0
├── ATTRIBUTIONS.md
├── PRIVACY.md
├── docs/superpowers/specs/   # this file and future design docs
├── packages/
│   ├── web/              # React SPA — map, layer registry
│   │   ├── src/
│   │   ├── public/data/  # townships.v1.geojson, gautrain.v1.geojson, a-re-yeng.v1.geojson
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── shared/            # LayerDefinition, TownshipProperties, TransitStop types
│       └── src/types/
└── data-pipeline/         # offline scripts, not an npm workspace, committed
    ├── src/
    │   ├── adapters/      # one per source (frith-boundaries, gautrain-osm, a-re-yeng, + stubs for myciti/prasa/rea-vaya/metrobus/durban-transport)
    │   ├── osrm-client.ts # public OSRM /table client, batched with delay
    │   └── export.ts
    └── README.md           # how to (re-)run, and how to populate the stubbed operators later
```

## 4. Data pipeline (v1)

1. **Boundaries** — fetch Adrian Frith's Tshwane (City of Tshwane / Pretoria) sub-place GeoJSON (or Stats SA shapefile + npm `shapefile`/`@turf/turf` conversion as fallback). Normalize to `TownshipProperties` base shape (id, name, population if available).
2. **Job centers** — six hardcoded reference points reflecting Pretoria's actual economic geography, not just the CBD: Pretoria CBD (Church Square), Menlyn, Centurion, Rosslyn (industrial/automotive), Hatfield (government/university/Gautrain hub), and Waterkloof/Brooklyn (office parks), in `constants/jobCenters.ts`.
3. **Routing** — for each township centroid, batch-query `router.project-osrm.org/table/v1/driving/...` for drive time to all six job centers in one table request; the township is tagged with whichever job center has the shortest drive time (`nearestJobCenter`, `commuteMinutes`). Respect public-server rate limits: small batches, delay between requests, retry on 429.
4. **Transit** —
   - Gautrain: query Overpass API for `operator=Gautrain` rail lines/stations within a Tshwane/Gauteng bounding box (OSM-tagged per SPEC §7).
   - A Re Yeng: fetch real route/stop data from the City of Tshwane open data portal if available; OSM-tagged (`operator=A Re Yeng` / `network=A Re Yeng`) fallback via Overpass per SPEC §7.
   - Adapters normalize each into the common `TransitLayer` shape (SPEC §10 Adapter pattern).
5. **Unemployment** — attempt a real Stats SA ward-level Tshwane download; if unavailable in a usable form, the layer definition still exists in the registry but its `dataSource` resolves to an empty dataset and the UI shows "data not yet available for this area" rather than any number.
6. **Join & export** — merge commute time + transit proximity onto township features; write `townships.v1.geojson`, `gautrain.v1.geojson`, `a-re-yeng.v1.geojson` to `packages/web/public/data`. Stub adapters for MyCiTi/PRASA/Rea Vaya/Metrobus/Durban Transport exist with typed interfaces and a registry entry each, but no data file — documented in `data-pipeline/README.md` as the mechanical next step (validates SPEC §11's extensibility claim without requiring those cities' data now).

## 5. Frontend (v1)

Unchanged from SPEC.md §4, minus anything AI/chat-related:
- Leaflet choropleth colored by `commute_minutes` to nearest of six Pretoria/Tshwane job centers
- Toggleable Gautrain and A Re Yeng overlays
- Unemployment choropleth toggle (real data or empty-state, per above)
- Apartheid-era boundary vs. satellite basemap toggle
- Click popups (name, population, commute time, nearest job center)
- Legend + narrative sidebar, collapsing to a bottom sheet/drawer on mobile
- Layer registry (SPEC §11) drives both the map layers and the toggle UI — new layers (including the stubbed transit operators once populated) require no `Map.tsx` changes

## 6. No backend

`wrangler.jsonc` serves `packages/web/dist` as static assets only. No `/api` route, no Workers AI binding, no `packages/api` workspace. CSP (SPEC §15) drops the `*.cloudflareinsights.com` connect-src/script-src AI-analytics-adjacent exception only insofar as it was chat-specific — Cloudflare Web Analytics itself (cookieless page views) stays, since that was never part of the AI chat feature.

## 7. Testing

TDD per SPEC §4: Vitest + React Testing Library + happy-dom. Priority coverage: color-scale function, commute-time formatting, GeoJSON property parsing, layer registry → toggle UI wiring (the real-world stress test SPEC §11 calls for), pipeline join logic (OSRM response → `commute_minutes`, transit-distance calculations, adapter normalization for each source).

## 8. Explicitly out of scope for v1

- Cape Town, Joburg, Durban data and their transit operators (MyCiTi, Rea Vaya, Metrobus, Durban Transport) — adapters/types exist, data doesn't yet. PRASA was originally in this list but was upgraded to a real Pretoria-area adapter (§4a) after the user pointed out it's more relevant to township commuters than Gautrain/A Re Yeng alone.
- AI data chat — removed, not deferred quietly; if revisited later it needs its own design doc
- Actual `wrangler deploy` — code/config ready, not executed this session
- Historical aerial imagery, minibus taxi routes, Group Areas Act overlay, land-use zoning — stretch goals, unchanged, still stretch

Note: `SPEC.md` (the original full long-term spec this document diverged from) was deleted from the repo by the user on 2026-07-28. This design doc is now the standalone source of truth for v1 — remaining "SPEC §N" references above describe decisions already folded into this document's own sections, not live citations.

## 4a. Real PRASA adapter (added mid-build)

Upgraded from stub to real per user request: PRASA's Pretoria commuter rail (Pretoria–Mamelodi, Pretoria–Atteridgeville/Saulsville, Pretoria–Eersterust/Pienaarspoort) is more relevant to township residents' actual commutes than Gautrain (higher fare, aimed at higher-income commuters) or A Re Yeng (limited BRT coverage) alone. OSM tags this network as `operator=PRASA` on rail ways and `network=Metrorail Gauteng`-family tags on stations — the adapter (`data-pipeline/src/adapters/prasa.ts`) queries both. Live-verified: 248 features (200 rail-way segments, 48 stations) in the Tshwane area. Three real transit layers ship in v1: Gautrain, A Re Yeng, PRASA.

Also added mid-build: Sandton and Rosebank as two additional (drive-time only) job centers, since Gautrain's real value for Pretoria commuters is substantially about reaching Johannesburg jobs — see §4's job center list (now 8 total, not 6).

## 9. Design System

Approved 2026-07-28. Concept: **"field survey document"** — apartheid spatial planning was executed *through* zoning maps and technical surveys, so the app borrows that visual register (hairline registration marks, a title-block header) to expose what those documents built, rather than a generic dashboard look. The hue story is grounded in Pretoria specifically — "Jacaranda City," known for ~70,000 jacaranda trees blooming purple every October — not a generic pan-African motif.

**Color** (6 named tokens, used across UI chrome *and* derived for the commute-time data scale):
| Token | Hex | Use |
|---|---|---|
| `ink` | `#241934` | page background |
| `panel` | `#35234A` | raised panels, sidebar/drawer |
| `line` | `#A78BC9` | hairline borders, registration ticks |
| `paper` | `#F2EDE6` | primary text |
| `jacaranda` | `#A87FE0` | primary accent (headings, active states) |
| `redearth` | `#C1502E` | secondary accent, alerts, "very long commute" |

Commute-time choropleth buckets (SPEC §12's `CommuteBucket` enum) derive from this palette rather than an unrelated data-viz scale: short = a muted veld green (`#7A9B6E`), moderate = brass/ochre (`#C9A227`), long = a lighter `redearth` (`#D6703F`), very long = `redearth` (`#C1502E`), no-data = a desaturated blue-grey. Verify WCAG AA contrast for any of these used as text/small UI elements, not just map fill (map fills sit at ~0.7 opacity over basemap tiles and aren't subject to text-contrast rules).

**Typography** (all self-hosted via Fontsource, all variable fonts):
- **Fraunces** — display headings and large commute-time numerals. A variable serif with a large optical-size axis; deliberately unexpected on a map/data app (which almost always defaults to a geometric sans).
- **Bricolage Grotesque** — body/UI text. A 2023-vintage variable grotesque, distinctive without being a current "AI app" default (Inter, Space Grotesk, Manrope, Poppins are explicitly avoided as overused).
- **Martian Mono** — data readouts (km, coordinates, commute-minute stats in popups/legend). Variable, squarish/technical character matching the "instrument/measurement" concept.

**Signature element:** a hairline border with four short perpendicular corner tick marks (drafting/blueprint registration marks), applied consistently to the title block (top-left, holding app name + data-as-of date, styled like a technical drawing's corner stamp), the legend/toggle panel, and popups. One recurring device — restraint everywhere else (per frontend-design's "spend your boldness in one place").

**Layout:** the map is full-bleed and *is* the page, not a widget inside a boxed dashboard. Title block anchors top-left; legend/toggle panel floats over the map corner on desktop, collapses to a bottom-sheet drawer on mobile (SPEC §4's responsive requirement).

**Performance note:** per the user's explicit requirement (2026-07-28), the app must be mobile-friendly and score full/100 on Google Lighthouse across Performance, Accessibility, Best Practices, and SEO — this is a hard bar, not aspirational, and must be verified with an actual Lighthouse run before the build is considered done (see plan's Task 18 / the standalone Lighthouse-audit task added to track this).
