import { beforeEach, describe, expect, it, vi } from "vitest";

async function importFreshModule() {
  vi.resetModules();
  return import("./useThemePreference");
}

describe("useThemePreference theme-color meta sync", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.head.innerHTML = "";
  });

  it("has no override meta tag for the system preference", async () => {
    const { setThemePreference } = await importFreshModule();
    setThemePreference("system");

    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("sets an override meta tag and data-theme attribute for dark", async () => {
    const { setThemePreference, THEME_COLOR } = await importFreshModule();
    setThemePreference("dark");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", THEME_COLOR.dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("sets an override meta tag and data-theme attribute for light", async () => {
    const { setThemePreference, THEME_COLOR } = await importFreshModule();
    setThemePreference("light");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", THEME_COLOR.light);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("removes the override meta tag when switching back to system", async () => {
    const { setThemePreference } = await importFreshModule();
    setThemePreference("dark");
    setThemePreference("system");

    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("updates the existing override meta tag's content instead of creating a new one", async () => {
    const { setThemePreference, THEME_COLOR } = await importFreshModule();
    setThemePreference("dark");
    setThemePreference("light");

    const metas = document.querySelectorAll(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(metas).toHaveLength(1);
    expect(metas[0]).toHaveAttribute("content", THEME_COLOR.light);
  });

  it("notifies subscribers when the preference changes", async () => {
    const { setThemePreference, useThemePreference } =
      await importFreshModule();
    const { act, renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useThemePreference());
    expect(result.current).toBe("system");

    act(() => {
      setThemePreference("dark");
    });

    expect(result.current).toBe("dark");
  });
});
