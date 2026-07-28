import { describe, expect, it } from "vitest";
import { formatCommuteTime } from "./formatCommuteTime";

describe("formatCommuteTime", () => {
  it("formats whole minutes", () => {
    expect(formatCommuteTime(23)).toBe("23 min");
  });

  it("rounds fractional minutes", () => {
    expect(formatCommuteTime(23.7)).toBe("24 min");
  });

  it("formats over an hour as hours and minutes", () => {
    expect(formatCommuteTime(95)).toBe("1h 35min");
  });

  it("formats a whole hour without stray minutes", () => {
    expect(formatCommuteTime(120)).toBe("2h 0min");
  });

  it("shows 'No data' for null", () => {
    expect(formatCommuteTime(null)).toBe("No data");
  });
});
