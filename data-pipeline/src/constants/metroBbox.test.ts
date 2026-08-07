import type { MetroId } from "@karta/app";
import { describe, expect, it } from "vitest";
import { getMetroBbox, getSharedTransitBbox, METRO_BBOX } from "./metroBbox";

describe("metroBbox", () => {
  it("returns the configured bbox for each metro", () => {
    expect(getMetroBbox("tshwane")).toBe(METRO_BBOX.tshwane);
    expect(getMetroBbox("johannesburg")).toBe(METRO_BBOX.johannesburg);
    expect(getMetroBbox("ekurhuleni")).toBe(METRO_BBOX.ekurhuleni);
    expect(getMetroBbox("emfuleni")).toBe(METRO_BBOX.emfuleni);
    expect(getMetroBbox("midvaal")).toBe(METRO_BBOX.midvaal);
    expect(getMetroBbox("lesedi")).toBe(METRO_BBOX.lesedi);
    expect(getMetroBbox("mogale-city")).toBe(METRO_BBOX["mogale-city"]);
    expect(getMetroBbox("rand-west-city")).toBe(METRO_BBOX["rand-west-city"]);
    expect(getMetroBbox("merafong-city")).toBe(METRO_BBOX["merafong-city"]);
  });

  it("builds one shared bbox that fully contains every metro bbox", () => {
    expect(getSharedTransitBbox(Object.keys(METRO_BBOX) as MetroId[])).toBe(
      "-26.92383,27.15634,-25.55,28.86129",
    );
  });

  it("unions only the metros it is given, not every configured metro", () => {
    expect(getSharedTransitBbox(["tshwane", "johannesburg"])).toBe(
      "-26.55,27.65,-25.55,28.4",
    );
  });

  it("throws when given no metros", () => {
    expect(() => getSharedTransitBbox([])).toThrow(
      /at least one metro is required/i,
    );
  });
});
