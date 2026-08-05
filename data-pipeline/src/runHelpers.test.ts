import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jobCenters from "./constants/jobCenters";
import {
  assertCompleteNetworkCoverage,
  assertMetroSetup,
  cleanupStagingDirectories,
  findJobCenterCountMismatch,
  formatDuration,
  mergeNetworkCoverage,
  promoteStagedOutput,
} from "./runHelpers";

describe("formatDuration", () => {
  it("formats sub-second durations in milliseconds", () => {
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats exactly 1000ms in seconds", () => {
    expect(formatDuration(1000)).toBe("1.00s");
  });

  it("formats multi-second durations in seconds, rounded to two decimals", () => {
    expect(formatDuration(12345)).toBe("12.35s");
  });
});

describe("mergeNetworkCoverage", () => {
  it("sums counts for networks that appear in multiple maps", () => {
    const merged = mergeNetworkCoverage(
      { Gautrain: 2, PRASA: 1 },
      { Gautrain: 3, "A Re Yeng": 5 },
    );

    expect(merged).toEqual({ Gautrain: 5, PRASA: 1, "A Re Yeng": 5 });
  });

  it("returns an empty object for no maps", () => {
    expect(mergeNetworkCoverage()).toEqual({});
  });
});

describe("assertCompleteNetworkCoverage", () => {
  it("does not throw when every required network has coverage", () => {
    expect(() =>
      assertCompleteNetworkCoverage({ Gautrain: 1, PRASA: 2 }, [
        "Gautrain",
        "PRASA",
      ]),
    ).not.toThrow();
  });

  it("throws listing every required network missing coverage", () => {
    expect(() =>
      assertCompleteNetworkCoverage({ Gautrain: 1 }, [
        "Gautrain",
        "PRASA",
        "Rea Vaya",
      ]),
    ).toThrow("Missing required transit network coverage: PRASA, Rea Vaya");
  });
});

describe("findJobCenterCountMismatch", () => {
  it("returns null when the counts match", () => {
    expect(findJobCenterCountMismatch("tshwane", 2, 2)).toBeNull();
  });

  it("describes the mismatch when the counts differ", () => {
    expect(findJobCenterCountMismatch("tshwane", 2, 1)).toBe(
      "Job center count mismatch for tshwane: expected 2, got 1",
    );
  });
});

describe("assertMetroSetup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw against the real METROS/getJobCentersForMetro data", () => {
    expect(() => assertMetroSetup()).not.toThrow();
  });

  it("throws when a metro's configured job centres don't match its declared count", () => {
    vi.spyOn(jobCenters, "getJobCentersForMetro").mockReturnValue([]);

    expect(() => assertMetroSetup()).toThrow(/Job center count mismatch/);
  });
});

describe("promoteStagedOutput and cleanupStagingDirectories", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(resolve(tmpdir(), "buffer-zones-run-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe("promoteStagedOutput", () => {
    it("moves the staged directory to the publish path when nothing is published yet", async () => {
      const stagedDir = resolve(dir, "staged");
      const publishDir = resolve(dir, "published");
      await mkdir(stagedDir);
      await writeFile(resolve(stagedDir, "marker.txt"), "staged");

      await promoteStagedOutput(stagedDir, publishDir);

      expect(await readFile(resolve(publishDir, "marker.txt"), "utf8")).toBe(
        "staged",
      );
    });

    it("replaces an existing published directory with the staged one", async () => {
      const stagedDir = resolve(dir, "staged");
      const publishDir = resolve(dir, "published");
      await mkdir(stagedDir);
      await writeFile(resolve(stagedDir, "marker.txt"), "new");
      await mkdir(publishDir);
      await writeFile(resolve(publishDir, "marker.txt"), "old");

      await promoteStagedOutput(stagedDir, publishDir);

      expect(await readFile(resolve(publishDir, "marker.txt"), "utf8")).toBe(
        "new",
      );
      await expect(
        readFile(resolve(`${publishDir}.backup`, "marker.txt"), "utf8"),
      ).rejects.toThrow();
    });

    it("rolls back to the previous published directory if the rename fails", async () => {
      const stagedDir = resolve(dir, "does-not-exist");
      const publishDir = resolve(dir, "published");
      await mkdir(publishDir);
      await writeFile(resolve(publishDir, "marker.txt"), "old");

      await expect(
        promoteStagedOutput(stagedDir, publishDir),
      ).rejects.toThrow();

      expect(await readFile(resolve(publishDir, "marker.txt"), "utf8")).toBe(
        "old",
      );
    });

    it("does not attempt to restore a backup when nothing was published before a failed promote", async () => {
      const stagedDir = resolve(dir, "does-not-exist");
      const publishDir = resolve(dir, "published");

      await expect(
        promoteStagedOutput(stagedDir, publishDir),
      ).rejects.toThrow();

      await expect(access(publishDir)).rejects.toThrow();
    });
  });

  describe("cleanupStagingDirectories", () => {
    it("removes only staging directories for the given region", async () => {
      await mkdir(resolve(dir, "gauteng.__staging__123"));
      await mkdir(resolve(dir, "gauteng.__staging__456"));
      await mkdir(resolve(dir, "western-cape.__staging__789"));
      await mkdir(resolve(dir, "gauteng"));

      await cleanupStagingDirectories(dir, "gauteng");

      const { readdir } = await import("node:fs/promises");
      const remaining = await readdir(dir);
      expect(remaining.sort()).toEqual(
        ["gauteng", "western-cape.__staging__789"].sort(),
      );
    });

    it("does nothing when the root directory doesn't exist", async () => {
      await expect(
        cleanupStagingDirectories(resolve(dir, "missing"), "gauteng"),
      ).resolves.toBeUndefined();
    });
  });
});
