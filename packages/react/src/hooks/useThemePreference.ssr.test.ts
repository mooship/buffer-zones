// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("useThemePreference on the server", () => {
  it("defaults the module-level preference to system when window is unavailable at import time", async () => {
    const { useThemePreference } = await import("./useThemePreference");

    function Consumer() {
      return useThemePreference();
    }

    const markup = renderToStaticMarkup(createElement(Consumer));

    expect(markup).toBe("system");
  });

  it("does not throw when initTheme runs without window or document", async () => {
    const { initTheme } = await import("./useThemePreference");

    expect(() =>
      initTheme({
        storageKey: "test-theme",
        colors: { light: "#fff", dark: "#000" },
      }),
    ).not.toThrow();
  });

  it("does not throw when setThemePreference runs without window or document", async () => {
    const { setThemePreference } = await import("./useThemePreference");

    expect(() => setThemePreference("dark")).not.toThrow();
  });
});
