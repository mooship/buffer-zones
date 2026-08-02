import { beforeEach, describe, expect, it, vi } from "vitest";

async function importFreshModule() {
  vi.resetModules();
  return import("./useThemePreference");
}

const TEST_COLORS = { light: "#edeff2", dark: "#23262c" };

describe("useThemePreference theme-color meta sync", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.head.innerHTML = "";
  });

  it("has no override meta tag for the system preference", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("system");

    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("does not mutate document head on module import", async () => {
    await importFreshModule();
    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
  });

  it("sets an override meta tag and data-theme attribute for dark", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("dark");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", TEST_COLORS.dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("sets an override meta tag and data-theme attribute for light", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("light");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", TEST_COLORS.light);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("removes the override meta tag when switching back to system", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("dark");
    setThemePreference("system");

    expect(
      document.querySelector('meta[name="theme-color"][data-theme-override]'),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("updates the existing override meta tag instead of creating a new one", async () => {
    const { setThemePreference, initTheme } = await importFreshModule();
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });
    setThemePreference("dark");
    setThemePreference("light");

    const metas = document.querySelectorAll(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(metas).toHaveLength(1);
    expect(metas[0]).toHaveAttribute("content", TEST_COLORS.light);
  });

  it("notifies subscribers when the preference changes", async () => {
    const { setThemePreference, initTheme, useThemePreference } =
      await importFreshModule();
    const { act, renderHook } = await import("@testing-library/react");
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });

    const { result } = renderHook(() => useThemePreference());
    expect(result.current).toBe("system");

    act(() => {
      setThemePreference("dark");
    });

    expect(result.current).toBe("dark");
  });

  it("uses fallback colors when initTheme has not been called", async () => {
    const { setThemePreference } = await importFreshModule();
    // No initTheme call — should use fallback
    setThemePreference("dark");

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", "#000000");
  });

  it("picks up an already-stored preference under initTheme's storage key, even when the module evaluated before initTheme ran", async () => {
    localStorage.setItem("test-theme", "dark");
    const { initTheme, useThemePreference } = await importFreshModule();
    // Module-level code has already run with the default storage key by this
    // point (it can't have read "test-theme" yet) — initTheme must re-read.
    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });

    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useThemePreference());

    expect(result.current).toBe("dark");
  });

  it("applies the theme-color meta tag for an already-stored explicit preference on initTheme", async () => {
    localStorage.setItem("test-theme", "dark");
    const { initTheme } = await importFreshModule();

    initTheme({ storageKey: "test-theme", colors: TEST_COLORS });

    const meta = document.querySelector(
      'meta[name="theme-color"][data-theme-override]',
    );
    expect(meta).toHaveAttribute("content", TEST_COLORS.dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
