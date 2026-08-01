# Stratum Design System

Stratum uses an app-owned design system aligned to Apple Human Interface
Guidelines and a restrained glass visual language. The app remains plain React,
CSS Modules, and CSS custom properties; no framework design library is introduced.

Primary reference skills and guidance:

- `.github/skills/apple-design/SKILL.md`
- `.claude/skills/apple-design.md`
- Apple HIG foundations: layout, materials, colour, typography, sidebars, and
	search fields

## Design direction

- Separate content from controls: map content fills the view, controls float as
	a functional layer above it.
- Use glass sparingly: apply translucent materials to navigation and controls,
	not to dense content regions.
- Treat motion as behaviour, not decoration: interruptible, velocity-aware,
	and reversible interactions for any drag or sheet transition.
- Keep hierarchy obvious: one accent for emphasis, semantic text contrast,
	and progressive disclosure instead of always-visible complexity.
- Preserve map-first communication: interface chrome must support evidence and
	place-reading, never dominate it.

## Token architecture

Core token source of truth remains `packages/web/src/index.css`.

### Foundation tokens

- Typeface tokens: `--font-display`, `--font-body`, `--font-mono`
- Spacing tokens: `--space-1` to `--space-4`
- Radius tokens: `--radius-sm`, `--radius-md`, `--radius-lg`
- Control sizing: `--control-height`, `--control-height-compact`

### Material tokens

Adopt semantic material tiers rather than ad hoc per-component blur/shadow.

- `--material-nav-bg`, `--material-nav-border`, `--material-nav-blur`
- `--material-panel-bg`, `--material-panel-border`, `--material-panel-blur`
- `--material-chip-bg`, `--material-chip-border`, `--material-chip-blur`
- `--material-overlay-scrim`

Rules:

- Heavier material tier for larger surfaces (panel, sheet, search container).
- Lighter tier for compact controls (icon buttons, segmented controls).
- No stacking of two light translucent materials directly on each other.
- Provide dark, light, and high-contrast variants for each semantic material.

### Colour tokens

Keep existing semantic colour naming and extend where needed.

- Base: `--color-ink`, `--color-panel`, `--color-line`, `--color-paper`
- Accent/status: `--color-ochre`, `--color-redearth`
- Secondary text: `--color-muted`
- Surface states: `--color-surface`, `--color-surface-hover`

Rules:

- One accent colour is used for primary emphasis only.
- Secondary labels remain monochrome or near-monochrome on glass surfaces.
- Any new colour token requires light and dark values plus a high-contrast
	strategy.

### Motion tokens

Duration-only transitions are allowed for static state changes. Gesture-driven
transitions require spring semantics.

- `--motion-duration-short`, `--motion-duration-medium`
- Spring defaults (implementation-level constants):
	- Resting UI transitions: damping 1.0, response 0.3 to 0.4
	- Momentum release: damping ~0.8, response 0.3 to 0.4

## Interaction system

### Direct manipulation

- Update sheet/panel/dragged objects continuously during pointer movement.
- Respect grab offset where the user starts touching, do not re-centre.
- Keep pointer capture active during drag interactions.

### Interruptibility

- Any active animation affecting draggable or sheet surfaces must be
	interruptible by immediate user input.
- New transitions start from the current presented value, not stale target
	state.
- Reversing direction should preserve blended velocity where possible.

### Momentum and boundaries

- Use projected momentum to choose snap target on release for drag sheets.
- Use progressive resistance near hard boundaries rather than abrupt stops.

## Typography system

- Keep the two-family system already in use (display/body and mono) unless a
	dedicated migration to SF-like metrics is approved.
- Apply size-relative tracking:
	- Large display styles use mild negative tracking.
	- Body text remains near zero tracking.
	- Dense metadata can use slight positive tracking where legibility improves.
- Use semantic type roles rather than one-off sizes:
	- Display
	- Heading
	- Body
	- Supporting
	- Data/mono

## Accessibility policy

- Minimum 44px touch targets for all interactive controls.
- Keyboard operation and visible focus remain mandatory for all controls.
- Honour reduced motion and reduced transparency preferences:
	- Reduced motion: cross-fade or static transitions for large surface movement.
	- Reduced transparency: increase opacity and remove blur where required.
- Preserve or improve current Lighthouse accessibility score.

## Component primitives

Preferred primitives and ownership:

- `ControlButton`: material surface behaviour, press feedback, focus treatment
- `SegmentedControl`: mutually exclusive option groups
- `IconButton`: icon-specific semantics and sizing, built on `ControlButton`
- `LocationSearchControl`: search affordance and input hierarchy

If a new control replicates these behaviours, extend a primitive before adding
new standalone CSS.

## Implementation guardrails

- No second parallel design system.
- No unscoped one-off blur values in component CSS.
- No fixed-duration keyframe animations for gesture-controlled transitions.
- Avoid visual novelty that competes with evidence layers.

## Success criteria

- Chrome feels cohesive as one floating control layer over the map.
- Mobile sheet drag and snap feel physically continuous and interruptible.
- Typography hierarchy is clearer at all sizes without visual noise.
- Reduced-motion and reduced-transparency modes remain fully usable.
- Existing unit and e2e behaviour is preserved or improved.