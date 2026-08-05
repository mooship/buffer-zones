import interStylesHref from "@fontsource-variable/inter/index.css?url";
import martianMonoStylesHref from "@fontsource-variable/martian-mono/index.css?url";
import leafletStylesHref from "leaflet/dist/leaflet.css?url";
import {
  Links,
  type LinksFunction,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { THEME_STORAGE_KEY } from "./constants/themeConfig";
import appStylesHref from "./index.css?url";
import { getLayers } from "./layers/registry";

/**
 * Pre-hydration theme-bootstrap script: reads the stored theme preference
 * and sets `data-theme` before first paint, avoiding a flash of the wrong
 * theme. Inlined (rather than an external `/theme-bootstrap.js` file) so it
 * runs without an extra render-blocking network request; the exact source
 * below is hashed into `_headers`' `Content-Security-Policy` `script-src` —
 * changing this string requires recomputing that hash (see `_headers`).
 */
const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (stored === "light" || stored === "dark") {
    document.documentElement.dataset.theme = stored;
  }
})();`;

/**
 * `<link rel=preload>` entries for every `defaultVisible` layer's GeoJSON
 * data source plus `companionSource` (e.g. a choropleth's area-boundary
 * file, fetched alongside it but not itself a `dataSource` entry),
 * deduplicated by URL (a URL shared by multiple layers preloads once).
 * @remarks A non-default-visible layer's data isn't preloaded at all —
 *   `preload` signals "needed for this render," which isn't true for a
 *   layer nobody has toggled on yet, and eagerly downloading it still costs
 *   real bandwidth that competes with what the initial render actually
 *   needs (confirmed via Lighthouse: preloading every layer regardless of
 *   visibility was pulling ~900KB of hidden-layer GeoJSON on every load,
 *   directly delaying LCP under throttled mobile network conditions). A
 *   toggled-on layer is fetched on demand by `useLayerData` instead.
 *   Computed once at module scope, like `STORY`/`PANEL_VIEWS` in
 *   `App.tsx` — `getLayers()` is a static in-memory array for the process
 *   lifetime, so there's nothing request-specific to recompute inside `links`.
 */
const GEOJSON_PRELOAD_LINKS = (() => {
  const urls = new Set<string>();
  for (const layer of getLayers()) {
    if (!layer.defaultVisible) {
      continue;
    }
    for (const source of layer.dataSource) {
      urls.add(source);
    }
    if (layer.companionSource) {
      urls.add(layer.companionSource);
    }
  }

  return Array.from(urls, (href) => ({
    rel: "preload" as const,
    href,
    as: "fetch" as const,
    crossOrigin: "anonymous" as const,
  }));
})();

/** React Router route module export: page `<title>`/`<meta>` tags. */
export const meta: MetaFunction = () => {
  return [
    { title: "Stratum" },
    {
      name: "description",
      content:
        "Visualising how apartheid-era spatial planning still shapes commute times and access to jobs in Tshwane and Johannesburg.",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
    },
  ];
};

/**
 * React Router route module export: `<link>` tags — self-hosted font/style
 * stylesheets, favicons, basemap-provider preconnects, and
 * `GEOJSON_PRELOAD_LINKS`.
 */
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: interStylesHref },
  { rel: "stylesheet", href: martianMonoStylesHref },
  { rel: "stylesheet", href: leafletStylesHref },
  { rel: "stylesheet", href: appStylesHref },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/favicon-32x32.png",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/favicon-16x16.png",
  },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "preconnect", href: "https://tile.openstreetmap.org" },
  { rel: "preconnect", href: "https://basemaps.cartocdn.com" },
  ...GEOJSON_PRELOAD_LINKS,
];

/**
 * React Router route module export: the document shell (`<html>`/`<head>`/`<body>`)
 * wrapping every route. Sets the pre-hydration `theme-color` meta tags and
 * inlines `THEME_BOOTSTRAP_SCRIPT` to apply the stored theme before paint.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="theme-color"
          content="#f5f1e6"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#15110b"
          media="(prefers-color-scheme: dark)"
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static, module-scope literal — see THEME_BOOTSTRAP_SCRIPT
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** React Router route module export: the root route component. */
export default function Root() {
  return <Outlet />;
}
