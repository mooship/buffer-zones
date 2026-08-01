import { describe, expect, it } from "vitest";
import { getRegionDefinition, REGIONS } from "./regions";

describe("regions", () => {
  it("defines the gauteng province region", () => {
    expect(REGIONS).toEqual([
      { id: "gauteng", label: "Gauteng", kind: "province" },
    ]);
  });

  it("looks up a region by id", () => {
    expect(getRegionDefinition("gauteng")?.label).toBe("Gauteng");
    expect(getRegionDefinition("not-a-real-region")).toBeUndefined();
  });
});
