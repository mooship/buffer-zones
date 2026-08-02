import {
  mkdir,
  mkdtemp,
  readFile,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCache,
  getCacheDir,
  hashKey,
  pruneCache,
  readJsonCache,
  writeJsonCache,
} from "./cache";

describe("cache", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-cache-"));
    // cacheEnabled() short-circuits to disabled whenever VITEST=true, which
    // vitest sets globally -- override it so the real I/O paths run.
    vi.stubEnv("VITEST", "false");
    vi.stubEnv("PIPELINE_CACHE_DIR", dir);
    vi.stubEnv("PIPELINE_CACHE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("hashKey", () => {
    it("produces a stable hash for the same parts", () => {
      expect(hashKey(["a", "b"])).toBe(hashKey(["a", "b"]));
    });

    it("produces different hashes for different parts", () => {
      expect(hashKey(["a", "b"])).not.toBe(hashKey(["a", "c"]));
    });
  });

  describe("getCacheDir", () => {
    it("reflects PIPELINE_CACHE_DIR", () => {
      expect(getCacheDir()).toBe(dir);
    });

    it("falls back to the default cache directory when PIPELINE_CACHE_DIR is unset", () => {
      delete process.env.PIPELINE_CACHE_DIR;
      const expectedDefault = resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../.cache",
      );

      expect(getCacheDir()).toBe(expectedDefault);
    });
  });

  describe("readJsonCache / writeJsonCache", () => {
    it("round-trips a written value", async () => {
      await writeJsonCache("ns", "key", { hello: "world" });

      const result = await readJsonCache<{ hello: string }>("ns", "key");

      expect(result).toEqual({ hello: "world" });
    });

    it("creates the namespace directory when writing", async () => {
      await writeJsonCache("ns2", "key", [1, 2, 3]);

      const written = await readFile(resolve(dir, "ns2", "key.json"), "utf8");
      expect(JSON.parse(written)).toEqual([1, 2, 3]);
    });

    it("returns null for a missing key", async () => {
      const result = await readJsonCache("ns", "missing");

      expect(result).toBeNull();
    });

    it("returns null for corrupt JSON instead of throwing", async () => {
      await mkdir(resolve(dir, "ns"), { recursive: true });
      await writeFile(resolve(dir, "ns", "bad.json"), "{not json");

      const result = await readJsonCache("ns", "bad");

      expect(result).toBeNull();
    });

    it("returns null when the entry is older than maxAgeMs", async () => {
      await writeJsonCache("ns", "stale", { v: 1 });
      const path = resolve(dir, "ns", "stale.json");
      const old = new Date(Date.now() - 10_000);
      await utimes(path, old, old);

      const result = await readJsonCache("ns", "stale", { maxAgeMs: 1000 });

      expect(result).toBeNull();
    });

    it("returns a stale entry when allowStale is true", async () => {
      await writeJsonCache("ns", "stale2", { v: 2 });
      const path = resolve(dir, "ns", "stale2.json");
      const old = new Date(Date.now() - 10_000);
      await utimes(path, old, old);

      const result = await readJsonCache("ns", "stale2", {
        maxAgeMs: 1000,
        allowStale: true,
      });

      expect(result).toEqual({ v: 2 });
    });

    it("no-ops when caching is disabled via PIPELINE_CACHE=0", async () => {
      vi.stubEnv("PIPELINE_CACHE", "0");

      await writeJsonCache("ns", "disabled", { v: 1 });
      const result = await readJsonCache("ns", "disabled");

      expect(result).toBeNull();
      await expect(
        readFile(resolve(dir, "ns", "disabled.json"), "utf8"),
      ).rejects.toThrow();
    });
  });

  describe("clearCache", () => {
    it("removes the whole cache directory", async () => {
      await writeJsonCache("ns", "key", { v: 1 });

      await clearCache();

      await expect(stat(dir)).rejects.toThrow();
    });

    it("does not throw when the cache directory doesn't exist", async () => {
      await clearCache();

      await expect(clearCache()).resolves.toBeUndefined();
    });
  });

  describe("pruneCache", () => {
    it("removes only entries older than maxAgeMs", async () => {
      await writeJsonCache("ns", "old", { v: "old" });
      await writeJsonCache("ns", "fresh", { v: "fresh" });
      const oldPath = resolve(dir, "ns", "old.json");
      const oldDate = new Date(Date.now() - 10_000);
      await utimes(oldPath, oldDate, oldDate);

      const removed = await pruneCache(5000);

      expect(removed).toBe(1);
      await expect(readFile(oldPath, "utf8")).rejects.toThrow();
      const fresh = await readFile(resolve(dir, "ns", "fresh.json"), "utf8");
      expect(JSON.parse(fresh)).toEqual({ v: "fresh" });
    });

    it("recurses into subdirectories", async () => {
      await writeJsonCache("ns/sub", "old", { v: "old" });
      const oldPath = resolve(dir, "ns", "sub", "old.json");
      const oldDate = new Date(Date.now() - 10_000);
      await utimes(oldPath, oldDate, oldDate);

      const removed = await pruneCache(5000);

      expect(removed).toBe(1);
    });

    it("returns 0 without throwing when the cache directory doesn't exist", async () => {
      vi.stubEnv("PIPELINE_CACHE_DIR", resolve(dir, "does-not-exist"));

      const removed = await pruneCache(1000);

      expect(removed).toBe(0);
    });
  });
});
