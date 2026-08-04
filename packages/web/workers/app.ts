import { createRequestHandler } from "react-router";

const OLD_HOSTNAME = "buffer-zones.timothybrits.co.za";
const NEW_HOSTNAME = "stratum.timothybrits.co.za";

const requestHandler = createRequestHandler(
  () => import("../build/server/index.js"),
  import.meta.env?.MODE ?? "production",
);

/**
 * The Cloudflare Workers entry point. Permanently redirects requests for the
 * app's old hostname to its current one, then delegates everything else to
 * the built React Router server bundle. There are no Cloudflare bindings to
 * thread through, so the request is passed on with no `RouterContextProvider`.
 */
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
