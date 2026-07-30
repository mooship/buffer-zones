# Buffer Zones Design System

Buffer Zones uses a repo-local design system informed by Material principles, but implemented with plain React components, CSS Modules, and app-owned tokens.

## Principles

- Clear hierarchy over decorative chrome.
- Predictable touch targets with a minimum 44px control height.
- One token layer for light and dark themes.
- Shared primitives for repeated interaction patterns.
- Map-first UI: controls should support the map, not compete with it.

## Token model

Core app tokens remain the source of truth in `packages/web/src/index.css`.

- Colour tokens: `--color-ink`, `--color-panel`, `--color-line`, `--color-paper`, `--color-ochre`, `--color-redearth`, `--color-muted`, `--color-surface`, `--color-surface-hover`.
- Shape tokens: `--shape-small`, `--shape-medium`, `--shape-large`.
- Elevation tokens: `--elevation-raised`, `--elevation-overlay`.
- Spacing tokens: `--space-1` through `--space-4`.
- Control tokens: `--control-height`, `--control-height-compact`, `--control-gap`, `--control-padding`.
- Motion tokens: `--motion-duration-short`, `--motion-duration-medium`.

The Material influence is structural rather than literal: surface, outline, primary, on-surface, and state-layer concepts are mapped onto this app's existing palette instead of importing Google's token names or components.

## Shared primitives

These components should be preferred whenever the interaction matches them.

- `SegmentedControl`: compact mutually-exclusive choices such as basemap and theme.
- `IconButton`: icon-only actions such as settings and legend triggers.

If a new control needs the same pressed-state, elevation, focus-ring, or control-height treatment, extend these primitives before introducing one-off CSS.

## Usage rules

- Use `SegmentedControl` for two to five mutually-exclusive options.
- Use `IconButton` for icon-only actions; the accessible label must describe the action, not the icon.
- Keep focus rings explicit and high-contrast.
- Prefer `--color-on-surface-variant` for secondary labels and metadata.
- Keep floating map controls on the same elevation family so the map chrome reads as one system.

## Non-goals

- No dependency on Material Web.
- No attempt to make the UI look like stock Google product chrome.
- No parallel second token system.