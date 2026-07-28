import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUnemploymentData } from "./unemployment";

describe("fetchUnemploymentData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no source responds successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const result = await fetchUnemploymentData();
    expect(result).toBeNull();
  });
});
