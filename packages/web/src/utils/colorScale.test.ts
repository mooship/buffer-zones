import { describe, expect, it } from "vitest";
import { COMMUTE_BUCKET_COLORS } from "../constants/colorScale";
import {
  CommuteBucket,
  commuteMinutesToColor,
  getCommuteBucket,
} from "./colorScale";

describe("getCommuteBucket", () => {
  it.each([
    [10, CommuteBucket.Short],
    [20, CommuteBucket.Short],
    [30, CommuteBucket.Moderate],
    [40, CommuteBucket.Moderate],
    [50, CommuteBucket.Long],
    [60, CommuteBucket.Long],
    [90, CommuteBucket.VeryLong],
  ])("classifies %i minutes as %s", (minutes, expected) => {
    expect(getCommuteBucket(minutes)).toBe(expected);
  });
});

describe("commuteMinutesToColor", () => {
  it("returns a distinct color per bucket", () => {
    const colors = new Set([
      commuteMinutesToColor(10),
      commuteMinutesToColor(30),
      commuteMinutesToColor(50),
      commuteMinutesToColor(90),
    ]);
    expect(colors.size).toBe(4);
  });

  it("returns the no-data color for null", () => {
    expect(commuteMinutesToColor(null)).toBe(COMMUTE_BUCKET_COLORS.noData);
  });
});
