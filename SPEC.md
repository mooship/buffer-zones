# Buffer Zones — SPEC

## 1. Overview

**Buffer Zones** is a web app that visualizes how apartheid-era spatial planning still shapes commute times and access to economic opportunity in South African cities today. Users see a choropleth map of townships/suburbs colored by drive/transit time to the nearest major job center, making the physical "buffer zones" (highways, industrial land, empty veld) between townships and wealthy suburbs visible and quantifiable.

**Primary goal:** portfolio project demonstrating GIS + spatial data engineering skills, with a genuinely interesting social-justice narrative.

**Secondary goal:** learn PostGIS, OSRM, spatial data pipelines, and web mapping (Leaflet).

---

## 2. Architecture Decision: Static SPA + One AI Edge Route

The core app is a serverless static SPA. The one deliberate exception is a single Workers AI route powering the data chat feature (section 16) — everything else remains static.

| Concern | Decision | Why |
|---|---|---|
| Hosting | Cloudflare Workers (static assets + one API route) | Single Cloudflare product for hosting, edge logic, and now the AI route — no separate platform needed for the chat feature |
| Rendering | Client-side SPA | No SEO requirement, no per-request dynamic data for the map itself — SSR adds complexity for no benefit here |
| Framework | React + TypeScript | Pairs cleanly with `react-leaflet`; TS gives you typed GeoJSON feature properties end-to-end |
| Map library | Leaflet (via `react-leaflet`) | Lightweight, no API key/billing, sufficient for 2D choropleth + markers |
| Styling | CSS Modules | Scoped styles, no runtime CSS-in-JS cost, plays well with Vite out of the box |
| Conditional classNames | `clsx` | Cleaner than template-string class logic, standard pairing with CSS Modules |
| Fonts | Fontsource + Fontaine | Fontsource self-hosts the font files; Fontaine generates metric-matched fallback fonts (via its Vite/Vitest-compatible plugin) to reduce layout shift while the webfont loads |
| Icons | Lucide (`lucide-react`) | Consistent icon set for layer toggles, legend markers, popup icons — tree-shakeable, single import per icon used |
| Build tool | Vite | Fast dev server, first-class TS/CSS Modules support, trivial Cloudflare Workers static-asset deploy |
| Linting/formatting | Biome | Single fast tool replacing ESLint + Prettier |
| Git hooks | Lefthook | Runs Biome + Vitest on pre-commit; faster and simpler config (YAML) than Husky |
| Analytics | Cloudflare Web Analytics | Cookieless, no consent banner needed, pairs naturally with Cloudflare Workers hosting |
| Testing | TDD — Vitest + React Testing Library | Vitest shares Vite's config/transform pipeline, so no separate test build setup |
| Data | Precomputed static GeoJSON | Routing is compute-heavy; do it once offline, not at request time |
| Routing engine | OSRM (self-hosted, local/Docker) | Used only in the offline data-prep step — never deployed |
| Database | None in production; local PostGIS during data prep only | Simplifies deployment; static files are enough for read-only viz |
| AI chat | Cloudflare Workers AI, one `/api/chat` route (section 16) | The single intentional exception to "no backend" — everything else on the map stays static |

**Key insight:** the only "hard" computation (drive-time routing) is a batch job you run once on your laptop. The map itself just serves and renders static JSON. The AI chat feature is the one place a real request hits live compute, and it's scoped narrowly and disclosed clearly (sections 14, 15, 16) rather than quietly contradicting the "static site" story.

---

## 3. Data Pipeline (offline, one-time / re-run manually)

1. **Boundaries** — Stats SA sub-place shapefiles (or Adrian Frith's cleaned census geography) → convert to GeoJSON via GDAL/OGR (`ogr2ogr`)
2. **Road network** — South Africa `.osm.pbf` extract from Geofabrik → load into local OSRM via Docker
3. **Reference points** — hardcoded list of major job centers (Cape Town CBD, Sandton, Rosebank, Umhlanga, etc.) with lat/lon
4. **Transit networks** — PRASA rail lines/stations, MyCiTi BRT routes/stops, Gautrain lines/stations, and municipal bus operators (Rea Vaya, Metrobus, A Re Yeng, Durban Transport/Go!Durban), sourced as GeoJSON/GTFS where available and converted via `ogr2ogr` if needed
5. **Compute** — Node/TypeScript script loops over township centroids, queries local OSRM `/table` or `/route` endpoint for drive time (and optionally transit time) to nearest job center; also computes straight-line or walking distance to nearest transit stop/station per network (`nearest_prasa_station_km`, `nearest_myciti_stop_km`, `nearest_gautrain_station_km`)
6. **Join** — merge commute-time, transit-proximity, and unemployment-rate results back onto the GeoJSON as feature properties (`commute_minutes`, `nearest_job_center`, `distance_km`, unemployment fields, plus the transit fields above)
7. **Export** — write final `townships.geojson` (with commute-time and unemployment properties joined in) plus separate `prasa.geojson`, `myciti.geojson`, `gautrain.geojson`, `rea-vaya.geojson`, `metrobus.geojson`, `a-re-yeng.geojson`, and `durban-transport.geojson` layer files into the app's `/public/data` folder

This pipeline lives in a `/data-pipeline` folder in the repo, separate from the app — run manually or via a Makefile, not part of CI/deploy.

---

## 4. Frontend App

- **Stack:** Vite + React + TypeScript, CSS Modules for styling, `clsx` for conditional classes, Fontsource + Fontaine for self-hosted/optimized fonts, Lucide for icons, Biome for lint/format
- **Map:** Leaflet via `react-leaflet`, choropleth layer colored by `commute_minutes` (color scale, e.g. green → red)
- **Interactions:**
  - Click township → popup with name, population, commute time, nearest job center
  - Toggle: apartheid-era boundary overlay vs. current satellite basemap (visually shows buffer zones)
  - Transit layers (toggleable, independent of the drive-time choropleth): PRASA rail lines/stations, MyCiTi BRT routes/stops, Gautrain lines/stations, and municipal bus operators (Rea Vaya + Metrobus for Joburg, A Re Yeng for Tshwane, Durban Transport/Go!Durban for eThekwini) — shown as overlay lines/markers so users can see which townships do or don't sit near formal transit
  - Second choropleth toggle: unemployment rate by ward (Stats SA Quarterly Labour Force Survey / General Household Survey) — lets users switch between "commute time" and "local unemployment," or view them side by side, so the map tells a compounding-hardship story rather than distance alone
  - Legend + short narrative sidebar explaining the data
- **Data loading:** fetch static GeoJSON from `/data`, no API calls at runtime

### Responsive / Mobile

- Map is the primary surface on all viewports — sidebar/legend collapses into a bottom sheet or slide-over drawer on narrow screens rather than a fixed side panel
- Layer toggles (transit layers, basemap switch) move into a compact control (e.g. Leaflet's `L.control.layers` or a custom floating button) instead of a full sidebar list on mobile
- Popups sized for touch — larger tap targets, no hover-dependent interactions (hover states from desktop must have a tap/click equivalent)
- Test on real breakpoints, not just browser resize: ~375px (small phone), ~768px (tablet), ~1024px+ (desktop)
- Leaflet handles touch pan/pinch-zoom natively — no extra library needed, but verify pinch-zoom isn't fighting page scroll (`touch-action` CSS, viewport meta tag)
- Performance matters more on mobile: keep exported GeoJSON simplified (see Concept 8, generalization) so low-end devices aren't parsing huge polygon files on a slow connection

### Testing (TDD)

- **Framework:** Vitest + React Testing Library + happy-dom (shares Vite's transform pipeline, no separate config; happy-dom over jsdom for faster test runs)
- **Approach:** write failing tests first for each unit before implementation —
  - Pure logic first: color-scale function (`commute_minutes` → hex color), commute-time formatting, GeoJSON property typing/parsing
  - Component behavior next: legend renders correct buckets, popup shows correct fields on click, toggle switches basemap layer
  - Leaflet map itself is thin-tested (mock `react-leaflet` primitives) — most test value is in the data-transform and UI-logic layers, not the map rendering internals
- **Coverage target:** prioritize the data pipeline join logic and color-scale/formatting utils — these are where bugs would silently mislead the reader, which matters more than chasing % coverage

---

## 5. Deployment

- Cloudflare Workers static assets (via `wrangler.jsonc` / `wrangler deploy`, not Pages) — `assets.directory` points at Vite's `dist` output, plus the one `/api/chat` route (section 16)
- CI: GitHub Actions runs Biome check + Vitest suite + build on PR; `wrangler deploy` on push to `main`
- No environment variables or secrets required for the map itself; the `/api/chat` route needs only the Workers AI binding (no external API key — Workers AI is native to the platform)
- The `/api/chat` route is the one place with per-request server logic; everything else stays static (section 2)

### Caching Strategy

- **Build assets (JS/CSS):** Vite content-hashes filenames by default (`app.a3f9c2.js`) — these are served with `Cache-Control: public, max-age=31536000, immutable`. Safe because a new deploy produces new filenames; nothing is ever served stale.
- **GeoJSON data files:** these change only when the data pipeline is manually re-run (section 3), not on every deploy. Version the filename on pipeline re-run (`townships.v2.geojson`) rather than overwriting in place, so old cached versions can't silently mismatch new app code. Served with a long `max-age` plus `stale-while-revalidate` so returning visitors get instant loads while a background check happens.
- **HTML (`index.html`):** short or no cache (`Cache-Control: no-cache`) so users always get the latest reference to the current hashed bundle — this is the one file that must not be aggressively cached, or users get stuck on an old version indefinitely.
- **Cloudflare edge cache:** Workers static assets are cached at Cloudflare's edge automatically; the `Cache-Control` headers above control both edge and browser behavior, set via `wrangler.jsonc` asset headers config. This applies to static assets only — the `/api/chat` route is explicitly not cached (each response is generated per-question).
- **Basemap tiles:** caching is controlled by the tile provider, outside this app's control — browser will cache per their standard HTTP headers.
- **Cache-busting on data updates:** because GeoJSON filenames are versioned (not overwritten), a new pipeline run requires updating the reference in the app's layer registry (section 11) — this makes data updates an explicit, reviewable code change (a diff in `registry.ts`) rather than an invisible cache-invalidation problem.

---

## 6. Stretch Goals

- Add minibus taxi route approximations as a further transit layer (informal, harder to source — no official GTFS, would need OSM tagging or crowd-sourced routes)
- **Historical aerial imagery slider** — pre-1994 aerial photos (National Archives, university GIS libraries) vs. current satellite imagery for a handful of key townships, showing the physical buffer zones (highways, industrial land, vacant land) forming around them. Highest visual impact of any stretch goal, but also highest effort — sourcing and georeferencing old aerial photos is real, non-trivial work, so scoped as stretch rather than core.
- Household income by ward (same Stats SA source family as the core unemployment layer, section 7) for a further choropleth toggle alongside commute time and unemployment
- Group Areas Act historical boundary overlay — the legal instrument that created the racial zoning in the first place, sourced from academic archives (UCT African Studies, Wits Historical Papers) if digitized boundaries can be found
- Current land use zoning — shows whether apartheid-era buffer land is still vacant/industrial today or has since been developed

---

## 7. Data Sources

- Stats SA: https://www.statssa.gov.za (census boundaries, household survey)
- Geofabrik SA extract: https://download.geofabrik.de/africa/south-africa.html
- OpenStreetMap / Overpass API for POIs
- Adrian Frith's census geography work (blog + GitHub) for cleaned historical boundary data
- PRASA — no official public GTFS feed as of last check; fall back to OSM-tagged rail lines/stations (`railway=rail`, operator=PRASA) via Overpass, verify against PRASA's published route maps
- MyCiTi — City of Cape Town open data portal publishes MyCiTi route/stop GeoJSON; check their GIS portal for current export links
- Gautrain — no official open GTFS; OSM has reasonably complete station/line tagging (`operator=Gautrain`) as a fallback
- Rea Vaya (Joburg BRT) — City of Joburg publishes some open data; OSM tagging (`operator=Rea Vaya`) as fallback
- Metrobus (Joburg municipal bus) — coverage on official open data portals is inconsistent; OSM tagging fallback, verify route completeness before relying on it
- A Re Yeng (Tshwane BRT) — similar situation to Rea Vaya, check Tshwane's open data portal first, OSM fallback
- Durban Transport / Go!Durban (eThekwini) — eThekwini municipality open data portal, OSM fallback
- Unemployment by ward — Stats SA Quarterly Labour Force Survey / General Household Survey, ward-level where available; check current release for geographic granularity before committing to ward vs. sub-place level

---

## 8. Non-Goals

- No user accounts, no live data ingestion, no general-purpose backend API — the sole exception is the single, narrowly-scoped `/api/chat` route (section 16)
- Not aiming for real-time accuracy — this is a static analytical snapshot, clearly dated in the UI

---

## 9. License

**AGPL-3.0.** Chosen because this is a public-interest data project — if someone forks it and runs a modified/hosted version (e.g. adding more cities, monetizing it), the AGPL's network-use clause requires them to release their source too, unlike MIT/BSD which wouldn't. Reasonable given the topic.

Dependency compatibility check: React (MIT), Leaflet (BSD-2-Clause), Vite (MIT), Turf.js (MIT), Biome (MIT), Vitest (MIT), Lucide (ISC), Fontaine (MIT) — all permissively licensed and compatible with being used inside an AGPL-licensed project. No conflicts.

A `LICENSE` file (standard AGPL-3.0 text) sits at repo root; source files can carry a short SPDX header (`// SPDX-License-Identifier: AGPL-3.0-only`) if desired.

---

## 10. Design Patterns

Patterns are used where they solve a real problem in this codebase, not for their own sake.

**Data pipeline**
- **Adapter** — PRASA (OSM-tagged), MyCiTi (city GIS export), and Gautrain (OSM-tagged) data each arrive in a different shape. One adapter per source normalizes each into a common `TransitLayer` interface before export, so downstream code never branches on source type.
- **Strategy** — `DistanceStrategy` interface wraps the "distance to nearest X" calculation (straight-line vs. OSRM-routed vs. walking-network), so the calculation method can be swapped without touching pipeline logic.

**Frontend**
- **Repository** — `TownshipDataRepository` abstracts "fetch static GeoJSON" behind an interface. Tests mock the repository instead of `fetch`; also a clean seam if a live API is added later.
- **Factory** — `createLayerConfig(type)` produces the right Leaflet layer setup (style function, popup renderer, icon) per layer type (township choropleth, PRASA, MyCiTi, Gautrain), keeping the map component free of branching logic.
- **Observer** — layer visibility toggles use React Context/hooks, which is structurally the observer pattern — no extra code needed, just named explicitly for clarity.
- **Decorator** — base color-scale function decorated with a colorblind-safe palette variant, without duplicating bucket logic.

**Explicitly avoided**
- **Singleton** for the Leaflet map instance — fights React's lifecycle and complicates testing; `react-leaflet` owns the map instance instead.
- No pattern is forced where a plain pure function is clearer (e.g. commute-time formatting).

**Workflow:** patterns are introduced one at a time, motivated by a failing test first (TDD) — not scaffolded up front as empty abstractions.

---

## 11. Layer Extensibility

Adding a new layer (e.g. minibus taxi routes, historical density, income choropleth) should require touching as few files as possible — no editing the map component's render logic, no branching on layer type scattered across the codebase.

**Design:**
- A `LayerDefinition` type/interface captures everything a layer needs: `id`, `label`, `dataSource` (path to its static GeoJSON), `style` function or choropleth config, `popupRenderer`, `defaultVisible`, and `layerType` (`'choropleth' | 'line' | 'point'`)
- New layers are registered in a single `layers/registry.ts` file as an array/object of `LayerDefinition`s — adding a layer means adding one entry here, not modifying `Map.tsx`
- `createLayerConfig(definition)` (the Factory from section 10) turns a `LayerDefinition` into the actual Leaflet layer + style + popup — this is the one place that needs to understand `layerType` variants
- The layer toggle UI (sidebar/drawer) renders itself from the registry — new layers automatically appear in the toggle list with no UI code changes
- Data pipeline mirrors this: each source gets its own adapter (section 10) that outputs a common shape, so adding a data source means writing one new adapter + one registry entry, not touching existing adapters

**Test coverage this motivates:** a test that registers a fake `LayerDefinition` and asserts it renders a toggle + calls the factory correctly — proves the registry pattern actually decouples new layers from core map code, rather than just claiming it does.

**Real-world test case:** the municipal bus operators (Rea Vaya, Metrobus, A Re Yeng, Durban Transport/Go!Durban) are the first genuine stress test of this system — four more layers, each city-specific, each with inconsistent data quality (section 7). If adding all four is mechanical (one adapter + one registry entry each, no core code changes), the extensibility design is validated. If it isn't, that's a signal the `LayerDefinition` interface needs revisiting before more layers are added.

---

## 12. Code Conventions (TypeScript)

Consistent use of TypeScript's type system rather than loose objects/strings scattered through the codebase.

- **`interface`** for object/data shapes that model domain entities — `LayerDefinition`, `TownshipProperties`, `TransitStop`, `DistanceStrategy`. Interfaces are used wherever a shape might reasonably be extended (e.g. a specific layer's properties extending a base `BaseFeatureProperties`).
- **`type`** for unions, intersections, and derived/mapped types — e.g. `LayerId = 'townships' | 'prasa' | 'myciti' | 'gautrain'`, or `type LayerStyle = ChoroplethStyle | LineStyle | PointStyle`.
- **`enum`** for fixed, named sets of related values that are referenced by name across the codebase and benefit from a real runtime object — e.g. `enum TransitNetwork { PRASA, MyCiTi, Gautrain }`, `enum CommuteBucket { Short, Moderate, Long, VeryLong }` used to drive the color-scale function. Prefer `enum` over raw string unions specifically when the value needs to be iterated over (`Object.values`) or used as a lookup key.
- **`const` objects / `as const`** for literal configuration values that don't need enum-style iteration — e.g. `ZOOM_LEVELS`, `COLOR_SCALE_BREAKPOINTS`, `JOB_CENTERS` — kept in a dedicated `constants/` directory, never inlined as magic numbers/strings in components or pipeline scripts.
- No `any` — unknown shapes (e.g. raw GTFS/OSM data before adapter normalization) are typed `unknown` and narrowed, or given an explicit `RawXxxFeature` interface matching the source format before being adapted into the app's internal types.

This directly supports section 11 (Layer Extensibility): `LayerDefinition` as a well-typed interface, `LayerId` as a union/enum, and style configs as discriminated unions (`layerType` as the discriminant) mean adding a new layer is a type-checked, autocomplete-guided change rather than a guess.

---

## 13. Attributions

Required by license, not optional — displayed persistently in the UI (map corner overlay, always visible, not buried in a modal) and duplicated in an `ATTRIBUTIONS.md` file at repo root.

**Data (license-required attribution):**
- **OpenStreetMap** — © OpenStreetMap contributors, licensed under the Open Data Commons Open Database License (ODbL). ODbL requires attribution and share-alike on the *derived database* — since township/transit GeoJSON exports are derived from OSM, this project's own exported OSM-derived data stays open under compatible terms (consistent with AGPL's spirit, no conflict, but worth stating explicitly since ODbL and AGPL are separate licenses covering data vs. code respectively).
- **Stats SA** — Statistics South Africa, boundaries and household survey data (check current Stats SA terms of use/reuse license at time of download — generally open for non-commercial/attributed use, verify before relying on it).
- **Geofabrik** — OSM extract hosting, attribution as an OSM data redistributor.
- **MyCiTi / City of Cape Town** — open data portal terms (check specific license tag on their GIS portal — often CC-BY).
- **PRASA / Gautrain** — sourced via OSM tagging (see section 7), so covered under the OSM/ODbL attribution above rather than a separate license.
- **Basemap tiles** — whichever tile provider is used (e.g. OSM standard tiles, CARTO) has its own attribution string required in the Leaflet attribution control — do not remove or hide it.

**Software (permissive, attribution appreciated but not required beyond LICENSE files in node_modules):**
- Leaflet, React, Vite, Turf.js, and other MIT/BSD dependencies — full list auto-generated via a `license-checker` script into `THIRD_PARTY_LICENSES.md`, not hand-maintained.
- Fontsource font package(s) — confirm the specific font's license (most Fontsource fonts are OFL, some are Apache — check per font chosen).

---

## 14. Privacy Policy

Mostly simple because the architecture (section 2) is mostly static — no accounts, no forms, no analytics beyond cookieless page views. The one exception, disclosed plainly below, is the AI chat feature.

- **No personal data is collected by the map itself.** There are no user accounts, no cookies set by the app, no forms, and browsing/viewing the map submits no data to any server.
- **AI chat feature (section 16):** questions typed into the chat are sent to Cloudflare Workers AI for processing, along with the relevant township/transit dataset as context. Chat messages are **not stored** server-side beyond the lifetime of generating a response — no chat history is persisted or logged by this app. Cloudflare's own infrastructure-level request logging (see below) still applies to these requests like any other. Don't type anything personally identifying into the chat; it isn't designed to handle that and isn't needed to ask questions about the map data.
- **Static hosting logs:** Cloudflare, as the hosting provider, may log standard request metadata (IP address, user agent, timestamp) as part of normal CDN/edge operation, independent of this app's code — this applies to both static asset requests and the `/api/chat` route. Link to Cloudflare's own privacy policy rather than restating it.
- **Analytics: Cloudflare Web Analytics.** Cookieless, privacy-respecting page-view analytics (no cross-site tracking, no fingerprinting, no personal data collected) — used to see portfolio traffic, nothing more. Because it's cookieless, no cookie-consent banner is required. Disclosed here rather than added silently later.
- **Third-party map tiles:** the basemap tile provider (see section 13) may log tile requests (IP address) as part of serving map imagery — this is standard for any web map and outside this app's control; named here for transparency.
- **No location tracking.** The app displays static precomputed data about townships/transit, not the user's own location — the browser's geolocation API is not used.
- Policy lives at `/privacy` route (or a static `PRIVACY.md` linked from the footer) and is dated so changes are visible in git history.

---

## 15. Security Headers & robots.txt

Set via `wrangler.jsonc` static-asset headers config (or a `_headers` file, Cloudflare's Pages-style convention which Workers static assets also honors) for the static assets; the `/api/chat` route (section 16) sets its own response headers in code since it's the one place per-request logic exists.

**Content-Security-Policy:**
- `default-src 'self'`
- `script-src 'self' *.cloudflareinsights.com` (Cloudflare Web Analytics beacon, section 2/14)
- `style-src 'self'` (CSS Modules compile to static stylesheets, no inline styles needed — avoid `'unsafe-inline'`)
- `img-src 'self' data: <tile-provider-domain>` (basemap tiles load from whichever provider is chosen, section 6 evenhandedness N/A here — just needs the actual domain once picked)
- `font-src 'self'` (Fontsource fonts are self-hosted, no external font CDN, consistent with section 2's original reasoning)
- `connect-src 'self' *.cloudflareinsights.com` (analytics beacon, static GeoJSON fetches, and the same-origin `/api/chat` route all covered by `'self'`)
- `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` (no legitimate reason for this app to be framed or embed plugins)

**Other headers:**
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=()` — explicitly disables geolocation API, reinforcing the privacy policy's claim (section 14) that the app doesn't use it
- `Strict-Transport-Security` — handled automatically by Cloudflare, no manual config needed

**robots.txt:**
- This is a public-interest data project meant to be discovered, not hidden — fully open:
  ```
  User-agent: *
  Allow: /
  ```
- A `sitemap.xml` isn't necessary for a single-page app with no distinct crawlable routes, but revisit if `/privacy` or other static routes are added later.

**Build optimizations (confirming, not new work):** Vite already handles content-hashed filenames (section 5's caching strategy), minification, tree-shaking, and automatic code-splitting by default — no additional configuration required for these. Worth stating explicitly in the spec so it's not mistaken for a gap.

---

## 16. AI Data Chat

A chat panel letting users ask natural-language questions about the map data — "which township has the longest commute?", "what's the unemployment rate near Khayelitsha?" — answered from the actual dataset, not general knowledge.

**Architecture:**
- Single Cloudflare Workers AI route, `/api/chat`, added to the same Worker already serving the static assets (section 2) — no new hosting platform
- **Model:** `@cf/google/gemma-4-26b-a4b-it` — a Mixture-of-Experts model (26B total parameters, 4B active per forward pass) that runs close to 4B-model speed while delivering higher reasoning quality, well suited to carefully answering questions about numeric/factual data rather than just pattern-matching. Fallback: `@cf/google/gemma-3-12b-it` (128K context window, more established/stable availability) if Gemma 4 has issues.
- **Always stream responses** (`stream: true`) per Cloudflare's own guidance — prevents buffering in memory, gives faster time-to-first-token, and avoids Worker timeout issues
- Request flow: user question → Worker route → relevant subset of the precomputed GeoJSON properties (not the whole dataset, to keep context small and answers grounded) is assembled as context → passed to the model → response streamed back to the client
- No conversation history stored server-side; each request is stateless. If multi-turn context matters, prior messages are re-sent from client-side React state (kept in memory only, cleared on refresh — consistent with "no chat history persisted," section 14)

**Cost behavior (free tier):**
- Workers AI free allocation is 10,000 Neurons/day, resetting daily at 00:00 UTC — well beyond expected portfolio-project traffic
- If the daily allocation is exceeded while still on the free Workers plan, further chat requests fail with an error until the next reset, rather than incurring any charge — money only enters the picture if the project is deliberately upgraded to the Workers Paid plan
- Stay on Workers Free for this project; treat hitting the daily cap as a signal worth noticing, not something to pre-emptively pay to avoid

**Grounding / guardrails:**
- System prompt constrains the model to answer *only* from the provided dataset context, and to say so plainly when a question falls outside what the data covers (e.g. "the data doesn't include that" rather than guessing)
- No general web knowledge or unrelated topics — this is a data-query interface, not a general chatbot; scope it narrowly in the system prompt to avoid it drifting into commentary the underlying data doesn't support
- Numbers in responses should be traceable back to specific `properties` fields already shown elsewhere in the UI (popups, legend) — if the chat can say it, a user should be able to verify it by clicking the relevant township

**Testing implications:**
- The `/api/chat` route is the one place in the codebase that needs integration-style tests against a real (or mocked) Workers AI call, distinct from the otherwise-pure unit-test approach in section 4 — mock the Workers AI binding in tests, assert the context-assembly logic (which GeoJSON subset gets sent) is correct independent of the model call itself
- Context-assembly logic (picking the relevant data subset for a question) is itself a good candidate for a pure, well-tested function — same TDD approach as the rest of the app (section 4), even though the final model call isn't deterministic

**Cost/scope note:** Workers AI has a free tier sufficient for portfolio-level traffic; this is the first place in the architecture where usage-based cost exists at all (section 2), worth mentioning if this is discussed in an interview context as a deliberate, scoped tradeoff rather than scope creep.

---

## 17. Repository Structure

Split into npm workspaces rather than one flat package — the web app and the API route run in genuinely different runtimes (browser vs. Cloudflare Workers), and keeping them separate avoids accidental cross-contamination (e.g. a DOM-dependent import sneaking into Worker code, which would fail at deploy rather than at compile time if not caught).

```
/
├── package.json              # workspace root, shared devDeps (Biome, TS, Vitest, Lefthook)
├── biome.jsonc
├── lefthook.yml
├── wrangler.jsonc            # ties web's dist + api's worker entry together for deploy
├── packages/
│   ├── web/                  # React SPA — the map, layer registry, chat UI
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── api/                  # Workers AI /api/chat route only
│   │   ├── src/
│   │   │   └── index.ts      # Worker entry, chat handler, context-assembly logic
│   │   └── package.json
│   └── shared/                # types only — LayerDefinition, GeoJSON feature property
│       │                      #   interfaces (section 12), used by web, api, and
│       │                      #   data-pipeline so they can't drift apart
│       └── src/types/
└── data-pipeline/             # offline scripts (section 3) — not a workspace package,
                                #   run manually/via Makefile, never built or deployed
```

**Why `shared` matters here specifically:** the `api` package's context-assembly logic (section 16) needs to understand the same `TownshipProperties`/`LayerDefinition` shapes the `web` package renders. Without a shared types package, those two would drift — e.g. a property renamed in the data pipeline breaks the chat's context assembly silently, with no compiler error. With `shared`, that's a type error at build time instead.

- Each workspace package gets its own `tsconfig.json` extending a root base config, with `web`'s targeting DOM/browser lib and `api`'s targeting Workers types (`@cloudflare/workers-types`) — deliberately different `lib` settings so each package only sees the globals actually available in its runtime.
- Testing stays split too: `web` uses Vitest + happy-dom (section 4), `api` uses Vitest with a Workers-appropriate test setup (e.g. `@cloudflare/vitest-pool-workers`) rather than happy-dom, since there's no DOM to fake there.
- `data-pipeline` deliberately stays outside the npm *workspace* (so it's never bundled into the deployed app or pulled into `web`/`api`'s dependency graph) — but it is fully committed to the repo, same as everything else. It's the part of the codebase that makes the project's data claims reproducible and auditable: anyone cloning the repo can re-run the exact scripts that produced `townships.v2.geojson` and verify the numbers themselves, which matters for a project making factual claims about commute times and unemployment.
- **What's committed vs. gitignored within `data-pipeline`:** the scripts themselves (Node/TypeScript), the job-center reference list, adapter code, and a `README.md` documenting how to run it are all committed. Large intermediate downloads (the `.osm.pbf` extract, raw Stats SA shapefiles) are gitignored — they're inputs fetched by the pipeline's setup step, not something to store in git history. The final output GeoJSON *is* committed (into `packages/web/public/data`), since that's the actual shipped artifact.

---