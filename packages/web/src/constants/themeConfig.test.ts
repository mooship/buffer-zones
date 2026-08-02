import { describe, expect, it } from "vitest";
import { THEME_COLOR, THEME_STORAGE_KEY } from "./themeConfig";

describe("themeConfig", () => {
  it("defines light and dark theme colors as valid hex codes", () => {
    expect(THEME_COLOR.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(THEME_COLOR.dark).toMatch(/^#[0-9a-f]{6}$/i);
    expect(THEME_COLOR.light).not.toBe(THEME_COLOR.dark);
  });

  it("keeps the pre-rename storage key so existing users' preferences aren't discarded", () => {
    expect(THEME_STORAGE_KEY).toBe("buffer-zones-theme");
  });
});
