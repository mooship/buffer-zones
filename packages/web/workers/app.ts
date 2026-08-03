import { createRequestHandler, RouterContextProvider } from "react-router";
import type { Env } from "../src/server/env";
import { envContext } from "../src/server/envContext";

const OLD_HOSTNAME = "buffer-zones.timothybrits.co.za";
const NEW_HOSTNAME = "stratum.timothybrits.co.za";

const requestHandler = createRequestHandler(
  () => import("../build/server/index.js"),
  import.meta.env?.MODE ?? "production",
);

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.hostname === OLD_HOSTNAME) {
      url.hostname = NEW_HOSTNAME;
      return Response.redirect(url.toString(), 301);
    }
    const context = new RouterContextProvider();
    context.set(envContext, env);
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
