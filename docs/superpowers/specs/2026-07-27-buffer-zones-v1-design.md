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

- Cape Town, Joburg, Durban data and their transit operators (MyCiTi, PRASA, Rea Vaya, Metrobus, Durban Transport) — adapters/types exist, data doesn't yet
- AI data chat (SPEC §16) — removed, not deferred quietly; if revisited later it needs its own design doc
- Actual `wrangler deploy` — code/config ready, not executed this session
- Historical aerial imagery, minibus taxi routes, Group Areas Act overlay, land-use zoning (SPEC §6 stretch goals — unchanged, still stretch)
