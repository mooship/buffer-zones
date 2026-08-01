import { METROS } from "@stratum/shared";
import { describe, expect, it } from "vitest";
import { JOB_CENTERS, getJobCentersForMetro } from "./jobCenters";

describe("getJobCentersForMetro", () => {
  it("splits the shared job centre list by metro", () => {
    const perMetro = METROS.map((metro) => ({
      id: metro.id,
      centers: getJobCentersForMetro(metro.id),
    }));

    expect(
      perMetro.reduce((total, item) => total + item.centers.length, 0),
    ).toBe(JOB_CENTERS.length);

    for (const { id, centers } of perMetro) {
      expect(centers.length).toBeGreaterThan(0);
      expect(centers.every((jobCenter) => jobCenter.metroId === id)).toBe(true);
    }

    expect(
      getJobCentersForMetro("johannesburg").map((jobCenter) => jobCenter.id),
    ).toContain("sandton");
    expect(
      getJobCentersForMetro("ekurhuleni").map((jobCenter) => jobCenter.id),
    ).toContain("germiston");
    expect(
      getJobCentersForMetro("emfuleni").map((jobCenter) => jobCenter.id),
    ).toContain("vereeniging-cbd");
    expect(
      getJobCentersForMetro("midvaal").map((jobCenter) => jobCenter.id),
    ).toContain("meyerton-cbd");
    expect(
      getJobCentersForMetro("lesedi").map((jobCenter) => jobCenter.id),
    ).toContain("heidelberg-cbd");
    expect(
      getJobCentersForMetro("mogale-city").map((jobCenter) => jobCenter.id),
    ).toContain("krugersdorp-cbd");
    expect(
      getJobCentersForMetro("rand-west-city").map((jobCenter) => jobCenter.id),
    ).toContain("randfontein-cbd");
    expect(
      getJobCentersForMetro("merafong-city").map((jobCenter) => jobCenter.id),
    ).toContain("carletonville-cbd");
  });
});
