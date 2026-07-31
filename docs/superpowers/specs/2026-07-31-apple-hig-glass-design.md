# Apple HIG glass overhaul — design spec

## Problem

The current UI is coherent but still a hybrid of earlier styles. Material
concepts, transitional map chrome patterns, and mixed motion behaviours are
present at the same time. This weakens spatial hierarchy, makes some interactions
feel less direct than intended, and increases design-system drift risk.

## Goal

Deliver a full visual and interaction overhaul aligned with Apple HIG foundations
and a restrained glass language, while preserving Buffer Zones' map-first,
accessibility-first mission and all current data functionality.

## Non-goals

- No data model or layer schema changes.
- No backend or pipeline behavioural change.
- No region-selection feature work.

## Source guidance

- Skill: `.github/skills/apple-design/SKILL.md`
- Skill mirror: `.claude/skills/apple-design.md`
- Apple HIG pages used:
  - Human Interface Guidelines (overview)
  - Materials
  - Layout
  - Typography
  - Colour
  - Sidebars
  - Search fields

## Principles for this app

1. Separate control layer from content layer.
2. Use translucent material for functional chrome only.
3. Keep interactions interruptible and velocity-aware.
4. Keep text highly legible across light, dark, and high-contrast contexts.
5. Use accent colour sparingly for emphasis.

## UI architecture changes

### Layering model

- Content layer: Leaflet map, township geometry, transit overlays.
- Functional layer: panel, sheet handle, settings, legend trigger, search.
- Modal layer: rare, task-specific overlays with explicit dimming scrim.

### Material model

- Replace one-off translucency values with semantic material tiers.
- Larger surfaces use heavier material and stronger separation.
- Small interactive controls use lighter material with high legibility text.
- Reduced transparency path switches to near-opaque materials.

### Motion model

- Keep simple state transitions on short opacity/transform durations.
- Use spring interaction for sheet drag/snap and any pointer-driven movement.
- Release handoff preserves gesture velocity.
- Panel transitions must be interruptible at all times.

### Typography model

- Keep current variable font stack unless approved otherwise.
- Introduce explicit display, heading, body, supporting, and mono roles.
- Enforce size-relative tracking and role-specific line-height.

## Component impact map

- `packages/web/src/index.css`
  - Token evolution: material tiers, colour semantics, motion constants.
- `packages/web/src/App.module.css`
  - Structural surface hierarchy for panel, floating controls, and sheet states.
- `packages/web/src/components/ControlButton/ControlButton.module.css`
  - Shared glass control behaviour, press feedback, and focus ring harmonisation.
- `packages/web/src/components/LocationSearchControl/*`
  - Search field structure and affordance alignment to HIG search principles.
- `packages/web/src/components/SettingsMenu/*`
  - Reduced visual clutter and stronger grouping hierarchy.
- `packages/web/src/components/MobileLegend/*`
  - Material/contrast updates to preserve mobile legibility over map imagery.

## Accessibility and inclusion requirements

- Preserve 44px minimum tap targets.
- Maintain robust keyboard navigation and focus visibility.
- Honour `prefers-reduced-motion` by replacing major surface movement with
  gentler alternatives.
- Honour reduced transparency with opaque fallback surfaces.
- Validate contrast on top of dynamic map backgrounds.

## Testing strategy requirements

Unit tests to update or add:

- `packages/web/src/App.test.tsx`
  - Ensure panel open/close and mobile sheet states remain correct after motion
    model changes.
- `packages/web/src/components/*` tests for shared controls
  - Verify aria labels, states, and control visibility remain stable.

E2E tests to update or add:

- `packages/web/e2e/responsive-panel.spec.ts`
  - Assert drag/snap still functions with new motion strategy.
- `packages/web/e2e/settings.spec.ts`
  - Assert control discoverability and visual state changes still map to settings.

Non-functional checks:

- Lighthouse accessibility remains at current bar.
- No performance regression caused by excessive blur/shadow stacking.

## Rollout approach

- Phase 1: Tokens and primitives.
- Phase 2: Layout surfaces and hierarchy.
- Phase 3: Motion and gesture polish.
- Phase 4: Accessibility and reduced-preference modes.
- Phase 5: Regression testing, visual QA, and release.