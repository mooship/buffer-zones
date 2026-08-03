import { describe, expect, it } from "vitest";
import { METROS } from "../../constants/metros";
import { TOWNSHIP_AREA_DEFINITIONS } from "../../constants/townships";
import { buildGautengDatasetSummary } from "./datasetSummary";

describe("buildGautengDatasetSummary", () => {
  it("reports the number of metros and recognised township areas", () => {
    const summary = buildGautengDatasetSummary();

    expect(summary).toContain(`${METROS.length} Gauteng metros`);
    expect(summary).toContain(
      `${TOWNSHIP_AREA_DEFINITIONS.length} recognised township areas`,
    );
  });

  it("reports the total selected job centres across all metros", () => {
    const summary = buildGautengDatasetSummary();
    const jobCenterCount = METROS.reduce(
      (total, metro) => total + metro.jobCenterCount,
      0,
    );

    expect(summary).toContain(`${jobCenterCount} selected job centres`);
  });

  it("names the transit networks covered", () => {
    const summary = buildGautengDatasetSummary();

    expect(summary).toContain("Gautrain");
    expect(summary).toContain("PRASA");
    expect(summary).toContain("Rea Vaya");
  });
});
