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
 * Builds `<link rel=preload>` entries for every configured layer's GeoJSON
 * data source plus `companionSource` (e.g. a choropleth's area-boundary
 * file, fetched alongside it but not itself a `dataSource` entry),
 * deduplicated by URL (a URL shared by multiple layers preloads once).
 * Sources for a default-visible layer preload at normal priority;
 * everything else preloads at `fetchPriority: "low"`.
 */
function getGeoJsonPreloadLinks() {
  const defaultVisibleByUrl = new Map<string, boolean>();
  for (const layer of getLayers()) {
    const sources = layer.companionSource
      ? [...layer.dataSource, layer.companionSource]
      : layer.dataSource;
    for (const source of sources) {
      const isDefaultVisible = defaultVisibleByUrl.get(source) ?? false;
      defaultVisibleByUrl.set(source, isDefaultVisible || layer.defaultVisible);
    }
  }

  return Array.from(defaultVisibleByUrl, ([href, defaultVisible]) => ({
    rel: "preload" as const,
    href,
    as: "fetch" as const,
    crossOrigin: "anonymous" as const,
    ...(defaultVisible ? {} : { fetchPriority: "low" as const }),
  }));
}

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
 * stylesheets, favicons, basemap-provider preconnects, and this layer's
 * GeoJSON preload links from `getGeoJsonPreloadLinks`.
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
  ...getGeoJsonPreloadLinks(),
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
