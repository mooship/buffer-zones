# Accessibility, Mobile and Impact Plan

Date: 2026-07-28
Status: Implemented

## Goal

Make the Tshwane experience usable without a mouse or visual map, resilient on phone-sized screens, and clearer about what the current evidence does and does not show.

## Delivered

- Add skip navigation and a named main map region.
- Lead with the spatial-planning story rather than configuration controls.
- Use a complete three-tab keyboard interaction model.
- Add a searchable, text-first township comparison linked to map selection.
- Group Census sub-place analysis units under a documented, versioned set of included township and settlement areas instead of labeling all Tshwane sub-places as townships.
- Increase primary controls and Leaflet zoom controls to mobile-sized targets.
- Turn the mobile panel into a bounded, internally scrolling bottom sheet.
- Keep low-priority data sources in a disclosure within the evidence panel.
- Allow the map introduction to minimise without removing its heading.
- Give the sheet one styled inner scrollbar with a content gutter.
- Return focus to the panel trigger when the sheet closes.
- Keep the car-time layer explicitly labeled as a modeled baseline to the nearest of eight selected centres.
- Verify with focused component tests, the full test suite, production build, formatter/linter, and desktop/mobile browser review.

## Evidence Boundary

The current pipeline stores only the fastest modeled car result for each township. Centre-by-centre comparison must not appear until the pipeline persists a complete routing matrix and regenerates the published GeoJSON. Public-transport job accessibility remains the intended primary measure once reproducible schedules and employment-location data are available.

## Acceptance Criteria

- A keyboard user can skip to the map information, switch tabs with arrow keys, browse places, and return focus after closing the panel.
- A screen-reader user can access township name, modeled time, nearest selected centre, and available supporting measures without operating Leaflet.
- Essential controls have at least a 48px interaction surface on mobile.
- The sheet does not obscure its trigger or source attribution.
- No UI language implies that car time is an observed commute or public-transport accessibility.