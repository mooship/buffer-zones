import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  cacheDir: "node_modules/.vite",
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    FontaineTransform.vite({
      fallbacks: ["Arial", "sans-serif"],
      resolvePath: (id) => new URL(`./node_modules/${id}`, import.meta.url),
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      manifestFilename: "site.webmanifest",
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Buffer Zones",
        short_name: "Buffer Zones",
        description:
          "Visualising how apartheid-era spatial planning still shapes commute times and access to jobs in Tshwane and Johannesburg.",
        theme_color: "#edeff2",
        background_color: "#edeff2",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/data/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "buffer-zones-data-cache",
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/(tile\.openstreetmap\.org|[a-z0-9.-]*basemaps\.cartocdn\.com|server\.arcgisonline\.com)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "buffer-zones-tiles-cache",
              expiration: {
                maxEntries: 256,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        entryFileNames: "assets/js/[name]-[hash].js",
        chunkFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const firstName = assetInfo.names?.[0] ?? assetInfo.name ?? "";

          if (/\.css$/i.test(firstName)) {
            return "assets/css/[name]-[hash][extname]";
          }

          if (/\.(woff2?|ttf|otf|eot)$/i.test(firstName)) {
            return "assets/fonts/[name]-[hash][extname]";
          }

          if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(firstName)) {
            return "assets/img/[name]-[hash][extname]";
          }

          return "assets/misc/[name]-[hash][extname]";
        },
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules\/(react|react-dom|scheduler)\//,
            },
            {
              name: "map-vendor",
              test: /node_modules\/(leaflet|react-leaflet)\//,
            },
            {
              name: "ui-vendor",
              test: /node_modules\/(lucide-react|zustand|usehooks-ts|zod)\//,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "e2e/**",
    ],
  },
});
