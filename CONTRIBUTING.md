# Contributing to Buffer Zones

Thanks for your interest. Buffer Zones is a public-interest mapping project
about the spatial legacy of apartheid-era planning across South African cities.
Contributions are welcome — especially better data sources, accessibility
improvements, and corrections to how areas are classified or described.

Please read [`README.md`](README.md) first for what the project is, what v1
deliberately does not claim, and where the documentation lives.

This project follows [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). By
participating, you agree to uphold those standards.

## Getting set up

```bash
npm install
npm run test        # Vitest across all workspaces
npm run test:coverage # same scope, with a coverage report
npm run typecheck   # shared typecheck + web build + data-pipeline typecheck
npm run lint        # biome check .
npm run format      # biome format --write .
npm run dev --workspace @buffer-zones/web
```

Run a single test file with `npx vitest run path/to/file.test.ts`.

`data-pipeline/` is a standalone project rather than an npm workspace, so it has
its own install step:

```bash
cd data-pipeline
npm install
npm run run       # full pipeline: boundaries, transit, OSRM routing, join, write output
npm run display   # legacy helper: rebuilds compact display files for per-metro source directories when present
```

See [`data-pipeline/README.md`](data-pipeline/README.md) before running the full
pipeline — it calls public third-party APIs.

A lefthook pre-commit hook runs Biome on staged files and the full Vitest suite,
so expect both on every commit. CI runs lint, typecheck, test, and build on every
pull request, and Playwright end-to-end tests run in a dedicated workflow.

## How the project is put together

Data flows in one direction: `data-pipeline` (run manually, offline) → static
GeoJSON committed to `packages/web/public/data/` → `packages/web`, which only
fetches those static files at runtime. `packages/shared` holds the types and
constants both ends agree on. There are no runtime API calls.

Two consequences worth knowing before you start:

- Adding a transit layer usually means one new adapter in
  `data-pipeline/src/adapters/`, one entry in `packages/web/src/layers/registry.ts`,
  and a pipeline re-run. Map rendering code should not need edits.
- Any new field added to GeoJSON properties must be optional or defaulted in the
  Zod schemas, because a CDN or browser may still be serving the previous payload
  shape after a deploy.

## Conventions

These are enforced in review, and some in CI:

- **Test first.** Write the failing test before the implementation, for bug fixes
  as well as features.
- **SOLID, DRY, KISS, YAGNI.** Prefer the simplest design that satisfies the
  current requirement. Don't build for hypothetical future needs.
- **No code comments** unless they capture a genuinely non-obvious *why* — a
  constraint, a workaround, an invariant. Never restate what the code says.
- **Braced, expanded `if` statements**, never single-line or braceless. Biome's
  `useBlockStatements` rule enforces this; don't disable it.
- **Accessibility is a requirement, not a nice-to-have.** Semantic HTML, keyboard
  navigation, visible focus states, and colour contrast are part of every UI
  change. The project holds a Lighthouse accessibility score of 100.
- **British English** in user-facing copy — UI text, labels, error messages. Code
  identifiers stay as they are.
- **Use the existing design system.** Colour tokens are CSS custom properties
  (`--color-ink`, `--color-paper`, `--color-panel`, and friends) defined in
  `packages/web/src/index.css` with light and dark values. Fonts are Inter
  Variable and Martian Mono Variable, self-hosted. Don't introduce new ad hoc
  colours or fonts.

## Contributing data or claims

This project is careful about what it asserts. When a change affects the map's
meaning rather than its code:

- State the source, its licence, and its vintage. Add it to
  [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).
- Prefer sources that can be fetched by script, so the pipeline stays
  reproducible.
- Changes to which areas count as included township areas belong in
  `packages/shared/src/constants/townships.ts`, and the reasoning belongs in
  [`docs/data/tshwane-area-classification.md`](docs/data/tshwane-area-classification.md)
  and/or [`docs/data/johannesburg-area-classification.md`](docs/data/johannesburg-area-classification.md).
- Don't overstate what the data supports. Keep copy within the limits the README
  already sets out.
- Never contribute personally identifying or household-level data.

## Pull requests

- Open an issue first for anything large or for a change in what the map claims.
  Small fixes can go straight to a pull request.
- Keep each pull request to one logical change.
- Describe what changed and why. If it's a visual change, include a screenshot in
  both light and dark themes.
- Make sure `npm run lint`, `npm run typecheck`, `npm run test`, and
  `npm run build` all pass locally.
- If you regenerated pipeline output, say which command you ran and why the data
  diff is what it is.

## Security

Please don't report suspected vulnerabilities in a public issue. See
[`SECURITY.md`](SECURITY.md) for how to report privately.

## Licence

The project is licensed under [AGPL-3.0](LICENSE). By contributing, you agree
your contribution is licensed under the same terms.
