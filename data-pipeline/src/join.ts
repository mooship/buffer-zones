import type { TownshipFeature } from "@buffer-zones/shared";
import type { NormalizedTownship } from "./adapters/boundaries";
import type { NearestJobCenterResult } from "./osrmClient";

export function joinTownshipData(
  townships: NormalizedTownship[],
  nearestJobCenters: NearestJobCenterResult[],
  unemployment: Map<string, number> | null,
): TownshipFeature[] {
  return townships.map((township, index) => {
    const nearest = nearestJobCenters[index] ?? {
      minutes: null,
      jobCenterId: null,
      jobCenterName: null,
    };
    return {
      type: "Feature",
      geometry: township.geometry,
      properties: {
        id: township.id,
        name: township.name,
        population: township.population,
        commuteMinutes: nearest.minutes,
        nearestJobCenter: nearest.jobCenterName ?? "",
        distanceKm: null,
        unemploymentRatePercent: unemployment?.get(township.id) ?? null,
        nearestGautrainStationKm: null,
        nearestAReYengStopKm: null,
      },
    };
  });
}
