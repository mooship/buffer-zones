import { describe, expect, it } from "vitest";
import { JOB_CENTERS, getJobCentersForMetro } from "./jobCenters";

describe("getJobCentersForMetro", () => {
  it("splits the shared job centre list by metro", () => {
    const tshwane = getJobCentersForMetro("tshwane");
    const johannesburg = getJobCentersForMetro("johannesburg");

    expect(tshwane.length + johannesburg.length).toBe(JOB_CENTERS.length);
    expect(tshwane.every((jobCenter) => jobCenter.metroId === "tshwane")).toBe(
      true,
    );
    expect(
      johannesburg.every((jobCenter) => jobCenter.metroId === "johannesburg"),
    ).toBe(true);
    expect(johannesburg.map((jobCenter) => jobCenter.id)).toContain("sandton");
  });
});
