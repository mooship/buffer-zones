# Apple HIG glass overhaul — implementation plan

Goal: redesign the app UI and design system to follow Apple HIG foundations and
a restrained glass direction while preserving existing map functionality,
accessibility guarantees, and behaviour validated by tests.

## Rules of execution

- Use `.github/skills/apple-design/SKILL.md` while designing and reviewing.
- Follow TDD for behaviour changes.
- Keep all interactions keyboard-accessible.
- Keep user-facing copy in British English.

## Phase 1: Token and primitive foundation

- [ ] Add semantic material tokens in `packages/web/src/index.css`.
- [ ] Preserve existing token names for compatibility while introducing
      material-tier aliases.
- [ ] Update shared primitives:
  - [ ] `packages/web/src/components/ControlButton/ControlButton.module.css`
  - [ ] `packages/web/src/components/SegmentedControl/*`
  - [ ] `packages/web/src/components/IconButton/*`
- [ ] Add/adjust primitive tests for focus, aria labels, and pressed states.

Validation:

- [ ] `npm run test --workspace @buffer-zones/web`
- [ ] `npm run lint`

## Phase 2: Layout and hierarchy overhaul

- [ ] Refactor floating chrome hierarchy in `packages/web/src/App.module.css`.
- [ ] Ensure panel and map controls read as one functional layer over content.
- [ ] Update search control placement and visual grouping in
      `packages/web/src/components/LocationSearchControl/*`.
- [ ] Update settings and legend containers to use the material tiers.

Test updates:

- [ ] Update `packages/web/src/App.test.tsx` selectors/assertions where needed.
- [ ] Add assertions for panel open state and mobile control discoverability if
      semantics change.

Validation:

- [ ] `npm run test --workspace @buffer-zones/web`
- [ ] `npm run typecheck`

## Phase 3: Motion and gesture model

- [ ] Replace non-interruptible transition patterns in sheet/panel interactions
      with spring-like, interruptible behaviour.
- [ ] Preserve drag velocity handoff and snap consistency.
- [ ] Ensure gesture reversal remains smooth.

Test updates:

- [ ] Extend `packages/web/src/App.test.tsx` drag/snap tests where motion state
      data attributes evolve.
- [ ] Update `packages/web/e2e/responsive-panel.spec.ts` gesture expectations.

Validation:

- [ ] `npm run test`
- [ ] `npm run test:e2e` (when environment supports Playwright run)

## Phase 4: Accessibility preference paths

- [ ] Add reduced-motion adaptations for large-surface transitions.
- [ ] Add reduced-transparency fallbacks for glass surfaces.
- [ ] Verify contrast for key controls over map content in both themes.

Test updates:

- [ ] Add CSS or UI tests where deterministic preference-based states are
      exposed.
- [ ] Add e2e checks for control visibility and usability in compact viewport.

Validation:

- [ ] `npm run test`
- [ ] Lighthouse accessibility audit pass (target unchanged from current bar).

## Phase 5: Stabilisation and release

- [ ] Run full suite:
  - [ ] `npm run test`
  - [ ] `npm run typecheck`
  - [ ] `npm run lint`
- [ ] Run focused regression e2e:
  - [ ] `npm run test:e2e`
- [ ] Capture before/after screenshots for design review.
- [ ] Final QA on desktop and mobile viewport behaviours.

## Definition of done

- Design tokens and control primitives are the single source of visual and
  interaction truth.
- Panel/search/settings/legend surfaces follow one coherent glass hierarchy.
- Gesture-driven interactions are interruptible and momentum-aware.
- Reduced-motion and reduced-transparency users receive equivalent,
  comprehensible behaviour.
- All relevant tests pass.