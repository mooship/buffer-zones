# Stratum Design System

Stratum uses an app-owned design system built on tonal, elevation-driven
surfaces rather than translucent "glass" materials. The app remains plain
React, CSS Modules, and CSS custom properties; no framework design library is
introduced, and no token is named after a specific vendor's design language —
token names describe what a value *is* (a surface tier, an elevation, a
shape, a state layer), not where the idea came from.

## Design direction

- Separate content from controls: map content fills the view, controls float
	as a functional layer above it.
- Surfaces are opaque and tonal: floating chrome (panels, sheets, menus,
	chips) is a flat, elevated colour — a small tint of the accent colour
	mixed into the base surface — differentiated by shadow and tone, never by
	blur or transparency.
- Elevation communicates hierarchy: higher-priority or more transient
	surfaces (a bottom sheet mid-drag, a dropdown menu) sit at a heavier
	elevation tier than resting chrome.
- Keep hierarchy obvious: one accent for emphasis, semantic text contrast,
	and progressive disclosure instead of always-visible complexity.
- Preserve map-first communication: interface chrome must support evidence
	and place-reading, never dominate it. Floating controls, rounded pill
	search fields, and a bottom-sheet-style info panel take cues from
	consumer map products' conventions for this — content fills the frame,
	controls float, and a drag handle exposes more detail on demand.

## Token architecture

Core token source of truth remains `packages/web/src/index.css`.

### Foundation tokens

- Typeface tokens: `--font-display`, `--font-body`, `--font-mono`
- Type scale tokens: `--font-size-2xs` (9px) through `--font-size-lg`
	(16.8px, popup heading emphasis) — a compact scale for dense map chrome,
	not long-form reading typography. Every component font-size references
	one of these; there are no one-off `rem`/`px` font-size values.
- Spacing tokens: `--space-1` to `--space-4`
- Shape (corner radius) tokens: `--shape-small`, `--shape-medium`,
	`--shape-large`, `--shape-full` (999px, for pills, circular controls, and
	scrollbar thumbs)
- Control sizing: `--control-height`, `--control-height-compact`
- Focus ring: `--focus-ring-width` (2px) is the single source of truth for
	ring thickness; colour and offset stay per-component since they depend on
	the surface a control sits on and whether its ring is inset or outset. The
	two `.leaflet-control-zoom`/`.leaflet-container` rings in `index.css` are
	a documented exception at 3px, since those controls sit directly on
	unpredictable map tile colour rather than a themed surface and need extra
	contrast margin.

### Elevation tokens

A three-tier shadow scale stands in for physical elevation. Each tier has
separate light/dark values (heavier, higher-contrast shadows in dark mode).

- `--elevation-1`: resting compact chrome (scale control, map labels)
- `--elevation-2`: raised controls and popups (zoom control, leaflet popups)
- `--elevation-3`: floating panels, sheets, and menus (the info panel,
	settings menu, legend, dragging bottom sheet)

### Surface tokens

Replacing per-component blur/gradient "glass" values with two reusable tonal
surface tiers, both derived from `--color-panel` and `--color-primary` so
they adapt automatically across light, dark, and `data-theme` overrides
without separate per-theme declarations:

- `--color-surface-container`: compact controls — buttons, search inputs,
	suggestion chips
- `--color-surface-container-high`: larger floating surfaces — the info
	panel, bottom sheet, settings menu, legend, popups

Borders on these surfaces use the existing `--color-outline` token (a
hairline tint of `--color-line`), strengthened to `--color-paper` under
`prefers-contrast: more`.

### State layer tokens

Hover, pressed, and selected states use flat opacity-tint tokens instead of
each component picking its own translucency percentage:

- `--state-hover`: 8% `--color-on-surface` tint
- `--state-pressed`: 12% `--color-on-surface` tint
- `--state-selected`: 12% `--color-primary` tint

Apply these directly as a `background` on elements whose resting background
is `transparent` and that sit on a known opaque parent (list rows, tabs,
menu options). For an element whose own resting background is already an
opaque tonal surface (e.g. `ControlButton`), blend the tint into that same
surface with `color-mix()` instead, so hover never introduces transparency
against the map.

### Colour tokens

Keep existing semantic colour naming and extend where needed.

- Base: `--color-ink`, `--color-panel`, `--color-line`, `--color-paper`
- Accent/status: `--color-ochre`, `--color-redearth`
- Secondary text: `--color-muted`
- Surface states: `--color-surface`, `--color-surface-hover`
- Semantic roles: `--color-primary`, `--color-on-primary`,
	`--color-on-surface`, `--color-on-surface-variant`, `--color-outline`

Rules:

- One accent colour is used for primary emphasis only.
- Secondary labels remain monochrome or near-monochrome.
- Any new colour token requires light and dark values plus a high-contrast
	strategy.

### Motion tokens

Duration-only transitions cover this app's static state changes (colour,
shadow, height). There is no gesture/spring system — the one gesture-driven
interaction (the mobile bottom-sheet drag) tracks pointer position directly
and projects a velocity-based snap target on release, rather than delegating
to a token-driven spring.

- `--motion-duration-short`, `--motion-duration-medium`

## Accessibility policy

- Minimum 44px touch targets for all interactive controls.
- Keyboard operation and visible focus remain mandatory for all controls.
- Honour reduced motion: `prefers-reduced-motion` collapses animation/transition
	durations globally.
- Because surfaces are opaque tonal colours rather than translucent
	materials, there is no `prefers-reduced-transparency` handling to
	maintain — there is no transparency on structural chrome to reduce.
- Preserve or improve current Lighthouse accessibility score.

## Component primitives

Preferred primitives and ownership:

- `ControlButton`: surface/state-layer behaviour, press feedback, focus
	treatment
- `SegmentedControl`: mutually exclusive option groups
- `IconButton`: icon-specific semantics and sizing, built on `ControlButton`
- `LocationSearchControl`: search affordance and input hierarchy

If a new control replicates these behaviours, extend a primitive before
adding new standalone CSS.

## Implementation guardrails

- No second parallel design system.
- No backdrop-filter/blur on structural chrome — elevation and tonal surface
	colour carry that job instead.
- No token or class name references a specific vendor's design language by
	name; describe the value, not its inspiration.
- Avoid visual novelty that competes with evidence layers.

## Success criteria

- Chrome feels cohesive as one floating control layer over the map.
- Mobile sheet drag and snap feel physically continuous and interruptible.
- Typography hierarchy is clearer at all sizes without visual noise.
- Reduced-motion mode remains fully usable.
- Existing unit and e2e behaviour is preserved or improved.
