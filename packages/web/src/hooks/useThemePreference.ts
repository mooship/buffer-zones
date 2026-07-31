import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "buffer-zones-theme";

export const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#edeff2",
  dark: "#23262c",
};

const THEME_COLOR_OVERRIDE_ATTR = "data-theme-override";

function isExplicitTheme(value: string | null): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
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

  const content = THEME_COLOR[preference];
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
  applyThemeAttribute(currentPreference);
}
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentPreference;
}

export function setThemePreference(preference: ThemePreference) {
  currentPreference = preference;
  if (typeof window !== "undefined") {
    if (preference === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  }
  applyThemeAttribute(preference);
  for (const listener of listeners) {
    listener();
  }
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
