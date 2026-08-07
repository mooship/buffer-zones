# Karta Plan D: Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the product from "Buffer Zones" to "Karta" across package metadata, deploy config, and documentation, deploying at the interim domain `karta.timothybrits.co.za` while keeping `buffer-zones.timothybrits.co.za` alive as a 301 redirect to the new domain.

**Architecture:** `wrangler.jsonc` gets a second `routes` entry for the old domain, both pointing at the same worker; `packages/web/workers/app.ts` gains a hostname check that 301-redirects any request arriving on the old hostname to the new one, preserving path and query string. Package names (`buffer-zones` → `karta`, `@buffer-zones/*` → `@karta/*`) are renamed mechanically across `package.json` files and every import site. Documentation (`README.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `CONTRIBUTING.md`, etc.) is swept for the old name.

**Tech Stack:** Cloudflare Workers/`wrangler`, npm workspaces, Markdown docs.

## Global Constraints

- Run last, after Plans A-C, so the package-name rename doesn't need to be repeated for files those plans touch.
- Every commit must leave `npm run test && npm run typecheck && npm run build` green.
- British English in all user-facing copy (unaffected by this plan, but don't introduce American spellings while editing docs).
- **Do not rename the GitHub repository itself** (`mooship/buffer-zones`) or push to any remote — that's a real, shared external resource; flagged as a manual follow-up for the user in this plan's final note, not a task here.

---

### Task 1: Add the redirect from the old domain to the new one

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `packages/web/workers/app.ts`
- Test: `packages/web/workers/app.test.ts` (new)

**Interfaces:**
- Produces: the worker's `fetch` handler 301-redirects any request whose `Host` matches the old domain to the same path/query on the new domain; all other requests are handled unchanged by `requestHandler`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/web/workers/app.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  createRequestHandler: () => vi.fn(async () => new Response("ok")),
}));

describe("worker fetch handler", () => {
  it("redirects the old domain to the new domain, preserving path and query", async () => {
    const workerModule = await import("./app");
    const request = new Request(
      "https://buffer-zones.timothybrits.co.za/some/path?query=1",
    );
    const response = await workerModule.default.fetch(request);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://karta.timothybrits.co.za/some/path?query=1",
    );
  });

  it("passes requests on the new domain through to the request handler unchanged", async () => {
    const workerModule = await import("./app");
    const request = new Request("https://karta.timothybrits.co.za/");
    const response = await workerModule.default.fetch(request);
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/web/workers/app.test.ts`
Expected: FAIL — current handler always calls `requestHandler`, never redirects; first test gets a 200, not 301.

- [ ] **Step 3: Implement the redirect**

```ts
// packages/web/workers/app.ts
import { createRequestHandler } from "react-router";

const OLD_HOSTNAME = "buffer-zones.timothybrits.co.za";
const NEW_HOSTNAME = "karta.timothybrits.co.za";

const requestHandler = createRequestHandler(
  () => import("../build/server/index.js"),
  import.meta.env?.MODE ?? "production",
);

export default {
  fetch(request: Request) {
    const url = new URL(request.url);
    if (url.hostname === OLD_HOSTNAME) {
      url.hostname = NEW_HOSTNAME;
      return Response.redirect(url.toString(), 301);
    }
    return requestHandler(request);
  },
} satisfies ExportedHandler;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/web/workers/app.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the old domain route to `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "karta",
  "compatibility_date": "2026-07-27",
  "main": "./packages/web/workers/app.ts",
  "workers_dev": true,
  "assets": {
    "directory": "./packages/web/build/client"
  },
  "observability": {
    "logs": {
      "enabled": true,
      "invocation_logs": true
    },
    "traces": {
      "enabled": true
    }
  },
  "routes": [
    { "pattern": "karta.timothybrits.co.za", "custom_domain": true },
    { "pattern": "buffer-zones.timothybrits.co.za", "custom_domain": true }
  ]
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add wrangler.jsonc packages/web/workers/app.ts packages/web/workers/app.test.ts
git commit -m "feat: redirect buffer-zones.timothybrits.co.za to karta.timothybrits.co.za"
```

---

### Task 2: Rename npm package identifiers

**Files:**
- Modify: `package.json` (root), `packages/web/package.json`, `packages/shared/package.json`, `data-pipeline/package.json`
- Modify: every file matching `grep -rl "@buffer-zones/shared" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .` (43 files at plan-writing time)

**Interfaces:**
- Produces: root package `name: "karta"`; `@buffer-zones/web` → `@karta/web`; `@buffer-zones/shared` → `@karta/shared`; `buffer-zones-data-pipeline` → `karta-data-pipeline`. Every `import ... from "@buffer-zones/shared"` becomes `import ... from "@karta/shared"`.

This is a mechanical, whole-repo identifier rename — no behaviour changes. Verification is the full test/typecheck/build suite, not new unit tests.

- [ ] **Step 1: Update the 4 `package.json` files**

In `package.json` (root): `"name": "buffer-zones"` → `"name": "karta"`; update the `"test:e2e"` and `"typecheck"` scripts' `--workspace @buffer-zones/web` references to `--workspace @karta/web`.

In `packages/web/package.json`: `"name": "@buffer-zones/web"` → `"name": "@karta/web"`; `"description": "Buffer Zones web SPA map viewer"` → `"description": "Karta web SPA map viewer"`; the dependency `"@buffer-zones/shared": "file:../shared"` → `"@karta/shared": "file:../shared"`.

In `packages/shared/package.json`: `"name": "@buffer-zones/shared"` → `"name": "@karta/shared"`.

In `data-pipeline/package.json`: `"name": "buffer-zones-data-pipeline"` → `"name": "karta-data-pipeline"`; the dependency `"@buffer-zones/shared": "file:../packages/shared"` → `"@karta/shared": "file:../packages/shared"`.

- [ ] **Step 2: Reinstall to refresh the workspace symlinks**

Run: `npm install`
Expected: succeeds, `node_modules/@karta/shared` and `node_modules/@karta/web` symlinks now exist; `node_modules/@buffer-zones/*` are gone.

- [ ] **Step 3: Rename every import site**

Run a scoped find-and-replace across source files only (never `node_modules`, never lockfiles by hand):

```bash
grep -rl "@buffer-zones/shared" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . \
  | xargs sed -i 's/@buffer-zones\/shared/@karta\/shared/g'
```

- [ ] **Step 4: Verify no stray references remain**

Run: `grep -rn "@buffer-zones" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .`
Expected: no output.

- [ ] **Step 5: Run the full repo test, typecheck, and build**

Run: `npm run test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Run the data-pipeline suite separately (not an npm workspace)**

Run: `cd data-pipeline && npm install && npm run test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: rename npm packages from buffer-zones to karta"
```

---

### Task 3: Update root documentation

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `.github/copilot-instructions.md`

**Interfaces:**
- Consumes: nothing new — pure copy edits.

- [ ] **Step 1: Update `README.md`**

Replace the `# Buffer Zones` title with `# Karta`, and the first paragraph's `**Buffer Zones** maps recognized township areas...` with copy that introduces Karta as the general platform and names the current dataset as one domain running on it, e.g.:

```markdown
# Karta

**Karta** is a public-interest geospatial layer platform. Its first published domain, **Gauteng spatial legacy**, maps apartheid-era spatial planning legacy across South African metros: recognized township areas, formal transit routes, and modeled car time to selected job centers in a single combined view. The car layer is a baseline spatial proxy, not an observed commute or a measure of public-transport access.
```

Update the `npm run dev --workspace @buffer-zones/web` command under "Contributing" to `npm run dev --workspace @karta/web`.

- [ ] **Step 2: Update `CLAUDE.md`**

Update the "What this is" section's opening line to match the `README.md` reframing from Step 1 (platform name first, current domain named second). Update every `@buffer-zones/web`/`@buffer-zones/shared` command example to `@karta/web`/`@karta/shared`. Add one line to "Architecture" noting the `gauteng-spatial-legacy` domain package under `packages/shared/src/domains/` as the first example domain, per Plan A.

- [ ] **Step 3: Update `.github/copilot-instructions.md`**

Apply the same edits as Step 2 (this file is a near-mirror of `CLAUDE.md`, per its own header comment) — keep the two files' content in sync.

- [ ] **Step 4: Verify no stray old-name references remain in the 3 files**

Run: `grep -n "Buffer Zones\|buffer-zones" README.md CLAUDE.md .github/copilot-instructions.md`
Expected: no output (aside from any intentional historical mention you choose to keep, e.g. "formerly Buffer Zones" — if you add one, it's a deliberate exception, not a miss).

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md .github/copilot-instructions.md
git commit -m "docs: rebrand root documentation to Karta"
```

---

### Task 4: Sweep remaining docs and policy files

**Files:**
- Modify: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PRIVACY.md`, `ATTRIBUTIONS.md`
- Modify: `docs/design-system.md`, `docs/data/*.md` (9 files)
- Modify: `data-pipeline/README.md`

**Interfaces:**
- Consumes: nothing new — pure copy edits.

- [ ] **Step 1: Find every remaining reference**

Run: `grep -rln "Buffer Zones\|buffer-zones" --include="*.md" --exclude-dir=node_modules .`

- [ ] **Step 2: Update each matched file**

For each file found (expected: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PRIVACY.md`, `ATTRIBUTIONS.md`, `docs/design-system.md`, the 9 `docs/data/*-area-classification.md` files, `data-pipeline/README.md`), open it and replace "Buffer Zones" with "Karta" and any `buffer-zones` workspace-name references with `karta`/`@karta/*` as appropriate to that file's context — these are project-name mentions, not deep content, so a direct read-and-replace per file (not a blind sed, since some may have prose context worth a light copy tweak, e.g. "This project, Buffer Zones," reading awkwardly as "This project, Karta," should become "This project" or "Karta" depending on the sentence).

- [ ] **Step 3: Verify no stray references remain**

Run: `grep -rln "Buffer Zones\|buffer-zones" --include="*.md" --exclude-dir=node_modules .`
Expected: no output (or only intentional historical mentions).

- [ ] **Step 4: Commit**

```bash
git add CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md PRIVACY.md ATTRIBUTIONS.md docs/design-system.md docs/data data-pipeline/README.md
git commit -m "docs: rebrand remaining documentation to Karta"
```

---

### Task 5: Update in-app copy referencing the old name

**Files:**
- Modify: `packages/web/src/App.tsx` (the `REPOSITORY_URL`/source-code link text and any visible "Buffer Zones" string)
- Modify: `packages/web/src/constants/metadata.ts` (wherever `REPOSITORY_URL`/`DATA_SOURCES` labels live, if they name the product)
- Modify: `packages/web/index.html` (or wherever the `<title>`/meta description is set) if it names "Buffer Zones"

**Interfaces:**
- Consumes: nothing new — pure copy/metadata edits.

- [ ] **Step 1: Find every in-app reference**

Run: `grep -rn "Buffer Zones\|buffer-zones" packages/web/src packages/web/index.html packages/web/public 2>/dev/null`

- [ ] **Step 2: Update the source-code link text**

The story panel's "Source code: mooship/buffer-zones" link text becomes "Source code: mooship/karta" **only once the GitHub repository itself has actually been renamed** (see this plan's final note) — until then, leave the link text and URL pointing at the real, still-named `mooship/buffer-zones` repository so the link isn't broken. Add a one-line code comment-free `// TODO`-free reminder is not appropriate per house style; instead, just leave this specific string unchanged for now and note it in the commit message as deferred.

- [ ] **Step 3: Update the page title/meta description and any other visible "Buffer Zones" copy**

Replace with "Karta" (and update the tagline if the meta description mentions "Buffer Zones" by name), keeping all other copy (data sources, licensing, evidence summary) unchanged.

- [ ] **Step 4: Run the full test and e2e suites**

Run: `npm run test && npm run build && npm run test:e2e`
Expected: PASS — if any e2e spec or unit test asserts on the literal string "Buffer Zones" (e.g. a page-title check), update that assertion to "Karta" in the same commit.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src packages/web/index.html
git commit -m "feat(web): rebrand in-app copy to Karta"
```

---

## Plan D self-review notes

- **Spec coverage:** §7 Rebrand (interim domain, name) → Task 1. Package/workspace renames implied by adopting the new name → Task 2. "All our docs, CLAUDE.md, the copilot mirror, README, wrangler, etc." (explicit user follow-up request) → Tasks 1, 3, 4, 5.
- **Deliberately deferred, not forgotten:** the GitHub repository `mooship/buffer-zones` itself is a real, shared external resource (forks, stars, issue links, existing PRs all point at it) — renaming it is a GitHub Settings action with broad blast radius, not a code change. **This is a manual step for the user to perform (or explicitly authorize) outside this plan** — once done, revisit Task 5 Step 2's deferred link-text update.
- **Registrar/DNS is also manual:** this plan configures the Cloudflare Worker/route side of `karta.timothybrits.co.za` and the redirect; actually pointing DNS at Cloudflare for that hostname (if not already done) is an infrastructure action outside this codebase, left to the user.
