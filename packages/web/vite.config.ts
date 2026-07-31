import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";

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
