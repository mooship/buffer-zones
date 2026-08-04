import { createContext, type RouterContext } from "react-router";
import type { Env } from "./env";

const GLOBAL_KEY = Symbol.for("stratum.envContext");

/**
 * React Router context key carrying Cloudflare Worker bindings.
 * @remarks Set once per request in `workers/app.ts`'s `fetch(request, env)`,
 * read by server route modules (e.g. `src/routes/api.ask.ts`'s `action`) via
 * `context.get(envContext)`.
 * @remarks `workers/app.ts` is bundled separately (by Wrangler) from the
 * route modules (bundled into `build/server/index.js` by Vite/React Router),
 * so this module's top-level code runs once per bundle. A plain
 * `createContext()` call would therefore produce two distinct context keys —
 * `.set()` in one bundle's copy would never match `.get()` in the other's.
 * Stashing the key on `globalThis` under a well-known symbol makes both
 * bundles share the same key at runtime, since they execute in the same
 * Worker isolate.
 */
const globalWithEnvContext = globalThis as unknown as {
  [GLOBAL_KEY]?: RouterContext<Env>;
};

function getOrCreateEnvContext(): RouterContext<Env> {
  const existing = globalWithEnvContext[GLOBAL_KEY];
  if (existing) {
    return existing;
  }
  const created = createContext<Env>();
  globalWithEnvContext[GLOBAL_KEY] = created;
  return created;
}

export const envContext: RouterContext<Env> = getOrCreateEnvContext();
