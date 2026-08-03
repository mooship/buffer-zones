import { createContext } from "react-router";
import type { Env } from "./env";

/**
 * React Router context key carrying Cloudflare Worker bindings.
 * @remarks Set once per request in `workers/app.ts`'s `fetch(request, env)`,
 * read by server route modules (e.g. `src/routes/api.ask.ts`'s `action`) via
 * `context.get(envContext)`.
 */
export const envContext = createContext<Env>();
