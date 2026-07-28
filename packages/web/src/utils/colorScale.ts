import {
  COMMUTE_BUCKET_BREAKPOINTS,
  COMMUTE_BUCKET_COLORS,
  GAUTRAIN_DISTANCE_BUCKET_BREAKPOINTS,
  GAUTRAIN_DISTANCE_BUCKET_COLORS,
} from "../constants/colorScale";

export enum CommuteBucket {
  Short = "Short",
  Moderate = "Moderate",
  Long = "Long",
  VeryLong = "VeryLong",
}

export function getCommuteBucket(minutes: number): CommuteBucket {
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.short) {
    return CommuteBucket.Short;
  }
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.moderate) {
    return CommuteBucket.Moderate;
  }
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.long) {
    return CommuteBucket.Long;
  }
  return CommuteBucket.VeryLong;
}

const BUCKET_COLOR_MAP: Record<CommuteBucket, string> = {
  [CommuteBucket.Short]: COMMUTE_BUCKET_COLORS.short,
  [CommuteBucket.Moderate]: COMMUTE_BUCKET_COLORS.moderate,
  [CommuteBucket.Long]: COMMUTE_BUCKET_COLORS.long,
  [CommuteBucket.VeryLong]: COMMUTE_BUCKET_COLORS.veryLong,
};

export function commuteMinutesToColor(minutes: number | null): string {
  if (minutes === null) {
    return COMMUTE_BUCKET_COLORS.noData;
  }
  return BUCKET_COLOR_MAP[getCommuteBucket(minutes)];
}

export enum GautrainDistanceBucket {
  Near = "Near",
  Moderate = "Moderate",
  Far = "Far",
  VeryFar = "VeryFar",
}

export function getGautrainDistanceBucket(km: number): GautrainDistanceBucket {
  if (km <= GAUTRAIN_DISTANCE_BUCKET_BREAKPOINTS.near) {
    return GautrainDistanceBucket.Near;
  }
  if (km <= GAUTRAIN_DISTANCE_BUCKET_BREAKPOINTS.moderate) {
    return GautrainDistanceBucket.Moderate;
  }
  if (km <= GAUTRAIN_DISTANCE_BUCKET_BREAKPOINTS.far) {
    return GautrainDistanceBucket.Far;
  }
  return GautrainDistanceBucket.VeryFar;
}

const GAUTRAIN_DISTANCE_COLOR_MAP: Record<GautrainDistanceBucket, string> = {
  [GautrainDistanceBucket.Near]: GAUTRAIN_DISTANCE_BUCKET_COLORS.near,
  [GautrainDistanceBucket.Moderate]: GAUTRAIN_DISTANCE_BUCKET_COLORS.moderate,
  [GautrainDistanceBucket.Far]: GAUTRAIN_DISTANCE_BUCKET_COLORS.far,
  [GautrainDistanceBucket.VeryFar]: GAUTRAIN_DISTANCE_BUCKET_COLORS.veryFar,
};

export function gautrainDistanceToColor(km: number | null): string {
  if (km === null) {
    return GAUTRAIN_DISTANCE_BUCKET_COLORS.noData;
  }
  return GAUTRAIN_DISTANCE_COLOR_MAP[getGautrainDistanceBucket(km)];
}
