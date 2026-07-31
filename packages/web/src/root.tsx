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
import appStylesHref from "./index.css?url";
import { getLayers } from "./layers/registry";

function getGeoJsonPreloadLinks() {
  const defaultVisibleByUrl = new Map<string, boolean>();
  for (const layer of getLayers()) {
    for (const source of layer.dataSource) {
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

export const meta: MetaFunction = () => {
  return [
    { title: "Buffer Zones" },
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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="theme-color"
          content="#edeff2"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#23262c"
          media="(prefers-color-scheme: dark)"
        />
        <script src="/theme-bootstrap.js" />
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

export default function Root() {
  return <Outlet />;
}
