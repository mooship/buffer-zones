import type { TownshipFeature } from "@stratum/shared";
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
  it("joins nearest job center, commute minutes, and transit distance onto each feature by index/id", () => {
    const townships = [township("A", "Alpha"), township("B", "Beta")];
    const nearest: NearestJobCenterResult[] = [
      { minutes: 23.5, jobCenterId: "menlyn", jobCenterName: "Menlyn" },
      { minutes: null, jobCenterId: null, jobCenterName: null },
    ];
    const nearestTransitKm = [4.2, null];

    const result = joinTownshipData(townships, nearest, nearestTransitKm);

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
      nearestTransitKm: 4.2,
    });
    expect(features[1].properties).toMatchObject({
      id: "B",
      commuteMinutes: null,
      nearestJobCenter: "",
      nearestTransitKm: null,
    });
    expect(features[0].geometry).toEqual(towns[0].geometry);
  });

  it("defaults to a null result when a township has no matching OSRM entry", () => {
    const result = joinTownshipData([township("A", "Alpha")], []);
    const features = result as [TownshipFeature];

    expect(features[0].properties).toMatchObject({
      commuteMinutes: null,
      nearestJobCenter: "",
    });
  });

  it("sets nearestTransitKm to null when no distance was computed", () => {
    const result = joinTownshipData(
      [township("A", "Alpha")],
      [
        {
          minutes: 10,
          jobCenterId: "pretoria-cbd",
          jobCenterName: "Pretoria CBD",
        },
      ],
    );
    const features = result as [TownshipFeature];
    expect(features[0].properties.nearestTransitKm).toBeNull();
  });
});
