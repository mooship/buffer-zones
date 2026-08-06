import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/martian-mono/index.css";
import "leaflet/dist/leaflet.css";
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
import "./index.css";

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
 * stylesheets, favicons, and basemap-provider preconnects.
 * @remarks Deliberately preloads no layer GeoJSON, not even a
 *   `defaultVisible` layer's. Nothing can consume that data until the map
 *   bundle has downloaded, hydrated, and mounted Leaflet, so a `preload`
 *   only puts hundreds of kilobytes of it on the wire *alongside* the very
 *   scripts and stylesheets that gate the map's first paint — measured via
 *   Lighthouse, preloading the default choropleth (~600KB compressed) cost
 *   ~0.9s of LCP and ~1.7s of Speed Index under throttled mobile
 *   conditions, because it starved the render-critical requests of
 *   bandwidth. `App`/`useLayerData` request it after hydration instead,
 *   where it competes with nothing.
 */
export const links: LinksFunction = () => [
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
