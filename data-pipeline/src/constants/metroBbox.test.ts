import { describe, expect, it } from "vitest";
import { METRO_BBOX, getMetroBbox, getSharedTransitBbox } from "./metroBbox";

describe("metroBbox", () => {
  it("returns the configured bbox for each metro", () => {
    expect(getMetroBbox("tshwane")).toBe(METRO_BBOX.tshwane);
    expect(getMetroBbox("johannesburg")).toBe(METRO_BBOX.johannesburg);
    expect(getMetroBbox("ekurhuleni")).toBe(METRO_BBOX.ekurhuleni);
    expect(getMetroBbox("emfuleni")).toBe(METRO_BBOX.emfuleni);
  });

  it("builds one shared bbox that fully contains every metro bbox", () => {
    expect(getSharedTransitBbox()).toBe("-26.79929,27.56909,-25.55,28.65");
  });
});
