import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "buffer-zones-theme";

function isExplicitTheme(value: string | null): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isExplicitTheme(stored) ? stored : "system";
}

function applyThemeAttribute(preference: ThemePreference) {
  if (preference === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

let currentPreference = readStoredPreference();
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
  if (preference === "system") {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  applyThemeAttribute(preference);
  for (const listener of listeners) {
    listener();
  }
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
