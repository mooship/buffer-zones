import { useSyncExternalStore } from "react";

/** Explicit theme choice. `"system"` follows the OS `prefers-color-scheme`. */
export type ThemePreference = "system" | "light" | "dark";

/** Configuration for the theme preference system. */
export interface ThemeConfig {
  /** localStorage key used to persist the preference. */
  storageKey: string;
  /** CSS color values used in the `<meta name="theme-color">` tag. */
  colors: { light: string; dark: string };
}

const DEFAULT_CONFIG: ThemeConfig = {
  storageKey: "stratum-theme",
  colors: { light: "#ffffff", dark: "#000000" },
};

let config: ThemeConfig = DEFAULT_CONFIG;

/**
 * Configures the theme preference system with app-specific values.
 * @param themeConfig - The storage key and colour values to use.
 * @remarks Call once at app bootstrap before any component renders. Re-reads
 *   the stored preference under the new `storageKey`, since the module's
 *   initial read (at import time, before `initTheme` can run) used whatever
 *   config was active then — typically the built-in default.
 * @example
 * initTheme({ storageKey: "stratum-theme", colors: THEME_COLOR });
 */
export function initTheme(themeConfig: ThemeConfig): void {
  config = themeConfig;
  if (typeof window !== "undefined") {
    currentPreference = readStoredPreference();
  }
}

const THEME_COLOR_OVERRIDE_ATTR = "data-theme-override";

function isExplicitTheme(value: string | null): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = localStorage.getItem(config.storageKey);
  return isExplicitTheme(stored) ? stored : "system";
}

function syncThemeColorMeta(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }
  const existingOverride = document.querySelector(
    `meta[name="theme-color"][${THEME_COLOR_OVERRIDE_ATTR}]`,
  );
  if (preference === "system") {
    existingOverride?.remove();
    return;
  }
  const content = config.colors[preference];
  if (existingOverride) {
    existingOverride.setAttribute("content", content);
    return;
  }
  const override = document.createElement("meta");
  override.setAttribute("name", "theme-color");
  override.setAttribute("content", content);
  override.setAttribute(THEME_COLOR_OVERRIDE_ATTR, "");
  document.head.prepend(override);
}

function applyThemeAttribute(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }
  if (preference === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
  syncThemeColorMeta(preference);
}

let currentPreference: ThemePreference = "system";
if (typeof window !== "undefined") {
  currentPreference = readStoredPreference();
}
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentPreference;
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

/**
 * Sets the user's theme preference, persists it to localStorage, and updates
 * the document's `data-theme` attribute and theme-color meta tag.
 * @param preference - `"system"` removes any explicit override.
 */
export function setThemePreference(preference: ThemePreference) {
  currentPreference = preference;
  if (typeof window !== "undefined") {
    if (preference === "system") {
      localStorage.removeItem(config.storageKey);
    } else {
      localStorage.setItem(config.storageKey, preference);
    }
  }
  applyThemeAttribute(preference);
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Returns the current theme preference, updating reactively when it changes.
 * @remarks Call `initTheme` before any component using this hook mounts.
 */
export function useThemePreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
