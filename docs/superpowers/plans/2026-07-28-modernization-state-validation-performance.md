# Modernization, State, Validation and Performance Plan

Date: 2026-07-28
Status: Implemented

## Goals

- Upgrade direct dependencies to the latest mutually compatible stable versions.
- Remove known npm audit findings in the root/workspace dependency tree.
- Move cross-cutting UI state to Zustand without hiding data fetching or Leaflet state.
- Validate static GeoJSON at the network boundary with Zod.
- Reduce display-data transfer and rendering cost without losing authoritative source geometry or visible boundary quality.
- Preserve 100 Lighthouse Accessibility, Best Practices and SEO scores while materially improving Performance.

## Dependency sequence

1. Upgrade Vite, plugin-react, Vitest, happy-dom and jest-dom; migrate config/tests.
2. Upgrade React, React DOM, React types and React Leaflet together.
3. Upgrade Lucide and remaining compatible direct dependencies.
4. Attempt TypeScript 7 and Node 26 types only after the runtime/tooling stack is green; retain the latest compatible major if upstream packages reject them.
5. Run npm audit for both root and the independent data-pipeline lockfile.

## State boundary

Zustand owns only cross-cutting user-interface state:

- visible layer IDs
- basemap
- panel open/view
- title expansion
- selected sub-place

React local state continues to own fetched data and component-local search/expansion state. Leaflet remains the owner of map camera and layer instances.

## Validation boundary

Zod validates unknown JSON returned by static data requests. Schemas validate GeoJSON collection/feature structure and domain properties used by the UI while allowing source-specific extra properties. Validation failures must include the requested URL and a concise issue path.

## Performance boundary

The committed full-resolution GeoJSON remains the reproducible source artifact. A separate display artifact must be generated topology-first so adjacent polygons retain shared borders. The app loads display geometry initially; richer source properties remain available where required for the text browser and popup evidence.

A display-data change is accepted only when:

- feature IDs and count remain stable;
- geometries remain valid Polygon or MultiPolygon values;
- included-area membership remains unchanged;
- visual review passes at desktop/mobile and detailed zoom;
- Lighthouse is measured against a production build;
- Accessibility, Best Practices and SEO remain 100.

## Verification

- Biome passes.
- All Vitest projects pass.
- All workspaces and the pipeline typecheck/build.
- Root and pipeline npm audits report no known vulnerabilities, or any accepted residual is documented.
- Production browser behavior and map interactions pass desktop/mobile checks.
- Before/after Lighthouse reports are summarized with run conditions and external-tile limitations.

## Result

- Direct dependencies upgraded to current compatible releases, including React 19, React Leaflet 5, Vite 8, Vitest 4, happy-dom 20, Lucide 1, TypeScript 7, Zustand 5 and Zod 4.
- Root and data-pipeline npm audits report zero vulnerabilities.
- Zustand owns cross-cutting UI state; fetched evidence, local search and Leaflet camera state remain with their natural owners.
- Zod Mini validates generic GeoJSON and township evidence properties at fetch boundaries.
- Full-resolution source artifacts remain committed. Compact topology-preserving display files retain all feature IDs, shared borders and less than one percent area drift.
- The initial JavaScript is split from Leaflet, reducing the initial application chunk from roughly 578 KB to 234 KB.
- Lighthouse production-preview results improved from mobile 57 / desktop 74 Performance to mobile 61 / desktop 83, while Accessibility, Best Practices and SEO remain 100 on both. Mobile LCP remains dependent on external OpenStreetMap tile timing.
