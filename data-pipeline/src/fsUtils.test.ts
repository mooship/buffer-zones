import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pathExists } from "./fsUtils";

describe("pathExists", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fsutils-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns true for a path that exists", async () => {
    expect(await pathExists(dir)).toBe(true);
  });

  it("returns false for a path that does not exist", async () => {
    expect(await pathExists(join(dir, "missing"))).toBe(false);
  });
});
