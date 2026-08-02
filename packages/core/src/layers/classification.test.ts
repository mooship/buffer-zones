import { describe, expect, it } from "vitest";
import type {
  CategorizedClassification,
  GraduatedClassification,
} from "../types/layer";
import { resolveClassification } from "./classification";

describe("resolveClassification", () => {
  describe("graduated", () => {
    const classification: GraduatedClassification<string> = {
      kind: "graduated",
      propertyKey: "commuteMinutes",
      stops: [
        { max: 20, value: "#7A9B6E", label: "Short" },
        { max: 40, value: "#C9A227", label: "Moderate" },
        { max: Number.POSITIVE_INFINITY, value: "#C1502E", label: "Long" },
      ],
      fallback: "#8A93A5",
    };

    it("resolves the stop whose max first covers the value", () => {
      expect(
        resolveClassification(classification, { commuteMinutes: 15 }),
      ).toBe("#7A9B6E");
      expect(
        resolveClassification(classification, { commuteMinutes: 40 }),
      ).toBe("#C9A227");
      expect(
        resolveClassification(classification, { commuteMinutes: 1000 }),
      ).toBe("#C1502E");
    });

    it("resolves correctly even when stops are declared out of ascending order", () => {
      const unordered: GraduatedClassification<string> = {
        ...classification,
        stops: [...classification.stops].reverse(),
      };
      expect(resolveClassification(unordered, { commuteMinutes: 15 })).toBe(
        "#7A9B6E",
      );
    });

    it("returns the fallback when the property is missing", () => {
      expect(resolveClassification(classification, {})).toBe("#8A93A5");
      expect(resolveClassification(classification, null)).toBe("#8A93A5");
      expect(resolveClassification(classification, undefined)).toBe("#8A93A5");
    });

    it("returns the fallback when the property is not a number", () => {
      expect(
        resolveClassification(classification, { commuteMinutes: "fast" }),
      ).toBe("#8A93A5");
    });
  });

  describe("categorized", () => {
    const classification: CategorizedClassification<number> = {
      kind: "categorized",
      propertyKey: "operator",
      stops: [
        { match: "gautrain", value: 4, label: "Gautrain" },
        { match: "prasa", value: 2, label: "PRASA" },
      ],
      fallback: 1,
    };

    it("resolves the stop matching the property value exactly", () => {
      expect(
        resolveClassification(classification, { operator: "gautrain" }),
      ).toBe(4);
      expect(resolveClassification(classification, { operator: "prasa" })).toBe(
        2,
      );
    });

    it("returns the fallback when no stop matches", () => {
      expect(
        resolveClassification(classification, { operator: "unknown" }),
      ).toBe(1);
    });

    it("returns the fallback when the property is missing or not a string", () => {
      expect(resolveClassification(classification, {})).toBe(1);
      expect(resolveClassification(classification, { operator: 42 })).toBe(1);
      expect(resolveClassification(classification, null)).toBe(1);
    });
  });
});
