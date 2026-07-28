import type { TownshipFeature } from "@buffer-zones/shared";
import { describe, expect, it } from "vitest";
import type { NormalizedTownship } from "./adapters/boundaries";
import { joinTownshipData } from "./join";
import type { NearestJobCenterResult } from "./osrmClient";

const township = (id: string, name: string): NormalizedTownship => ({
  id,
  name,
  population: 1000,
  centroid: { lat: -25.75, lon: 28.2 },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [28, -25.8],
        [28.1, -25.8],
        [28.1, -25.7],
        [28, -25.7],
        [28, -25.8],
      ],
    ],
  },
});

describe("joinTownshipData", () => {
  it("joins nearest job center, commute minutes, and unemployment rate onto each feature by index/id", () => {
    const townships = [township("A", "Alpha"), township("B", "Beta")];
    const nearest: NearestJobCenterResult[] = [
      { minutes: 23.5, jobCenterId: "menlyn", jobCenterName: "Menlyn" },
      { minutes: null, jobCenterId: null, jobCenterName: null },
    ];
    const unemployment = new Map([["A", 41.2]]);

    const result = joinTownshipData(townships, nearest, unemployment);

    expect(result).toHaveLength(2);
    const features = result as [TownshipFeature, TownshipFeature];
    const towns = townships as [
      (typeof townships)[number],
      (typeof townships)[number],
    ];
    expect(features[0].properties).toMatchObject({
      id: "A",
      name: "Alpha",
      commuteMinutes: 23.5,
      nearestJobCenter: "Menlyn",
      unemploymentRatePercent: 41.2,
    });
    expect(features[1].properties).toMatchObject({
      id: "B",
      commuteMinutes: null,
      nearestJobCenter: "",
      unemploymentRatePercent: null,
    });
    expect(features[0].geometry).toEqual(towns[0].geometry);
  });

  it("sets unemploymentRatePercent to null for every feature when unemployment data is unavailable", () => {
    const result = joinTownshipData(
      [township("A", "Alpha")],
      [
        {
          minutes: 10,
          jobCenterId: "pretoria-cbd",
          jobCenterName: "Pretoria CBD",
        },
      ],
      null,
    );
    const features = result as [TownshipFeature];
    expect(features[0].properties.unemploymentRatePercent).toBeNull();
  });
});
