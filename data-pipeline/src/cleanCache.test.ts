import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  clearCache: vi.fn<() => Promise<void>>(),
  getCacheDir: vi.fn<() => string>(),
  pruneCache: vi.fn<(maxAgeMs: number) => Promise<number>>(),
}));

vi.mock("./cache", () => ({
  clearCache: cacheMocks.clearCache,
  getCacheDir: cacheMocks.getCacheDir,
  pruneCache: cacheMocks.pruneCache,
}));

import { parseMaxAgeDays, parseMode, runCleanCache } from "./cleanCache";

describe("cleanCache", () => {
  beforeEach(() => {
    cacheMocks.clearCache.mockReset().mockResolvedValue(undefined);
    cacheMocks.getCacheDir.mockReset().mockReturnValue("/tmp/cache");
    cacheMocks.pruneCache.mockReset().mockResolvedValue(3);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses all mode when --all is provided", () => {
    expect(parseMode(["node", "cleanCache.ts", "--all"])).toBe("all");
    expect(parseMode(["node", "cleanCache.ts"])).toBe("stale");
  });

  it("defaults max age to 7 days", () => {
    expect(parseMaxAgeDays(["node", "cleanCache.ts"])).toBe(7);
  });

  it("throws when --max-age-days is not a positive number", () => {
    expect(() =>
      parseMaxAgeDays(["node", "cleanCache.ts", "--max-age-days", "0"]),
    ).toThrow("--max-age-days requires a positive number");
    expect(() =>
      parseMaxAgeDays([
        "node",
        "cleanCache.ts",
        "--max-age-days",
        "not-a-number",
      ]),
    ).toThrow("--max-age-days requires a positive number");
  });

  it("clears all cache data in all mode", async () => {
    await runCleanCache(["node", "cleanCache.ts", "--all"]);

    expect(cacheMocks.clearCache).toHaveBeenCalledTimes(1);
    expect(cacheMocks.pruneCache).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      "Removed cache directory: /tmp/cache",
    );
  });

  it("prunes stale cache files using the provided max age", async () => {
    await runCleanCache(["node", "cleanCache.ts", "--max-age-days", "2"]);

    expect(cacheMocks.clearCache).not.toHaveBeenCalled();
    expect(cacheMocks.pruneCache).toHaveBeenCalledWith(2 * 24 * 60 * 60 * 1000);
    expect(console.log).toHaveBeenCalledWith(
      "Pruned 3 stale cache file(s) older than 2 day(s) from /tmp/cache",
    );
  });
});
