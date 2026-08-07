# `@karta/react`

Generic React hooks for Karta applications, with no map, Leaflet, or domain-data dependency.

## What belongs here

- **`usePrefersDarkMode(): boolean`** — tracks the OS-level `prefers-color-scheme: dark` media query.
- **`useThemePreference()` / `setThemePreference(preference)` / `initTheme(config)`** — a `useSyncExternalStore`-backed theme preference store (`"system" | "light" | "dark"`), persisted to `localStorage`, syncing `document.documentElement.dataset.theme` and a `<meta name="theme-color">` override.

`initTheme({ storageKey, colors })` must be called once at app bootstrap, before hydration and before any component using `useThemePreference()` mounts — the storage key and light/dark colour pair are app-specific and are no longer baked into the hook. Calling `initTheme` also re-reads the already-stored preference under the newly configured key: the module's own top-level read (which happens at import time, before `initTheme` can run) uses the built-in default config, so without this re-read a caller's existing stored preference would silently be ignored on first render.

```tsx
// entry.client.tsx, before hydrateRoot
import { initTheme } from "@karta/react";

initTheme({
  storageKey: "my-app-theme",
  colors: { light: "#ffffff", dark: "#000000" },
});
```

## What doesn't belong here

- Leaflet, map rendering, or any `@karta/map`/`@karta/core` dependency.
- Domain data or app-specific configuration values (colours, storage keys) — pass those into `initTheme`, don't hardcode them.
