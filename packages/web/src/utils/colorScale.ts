import {
  COMMUTE_BUCKET_BREAKPOINTS,
  COMMUTE_BUCKET_COLORS,
  TRANSIT_DISTANCE_BUCKET_BREAKPOINTS,
  TRANSIT_DISTANCE_BUCKET_COLORS,
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

export enum TransitDistanceBucket {
  Near = "Near",
  Moderate = "Moderate",
  Far = "Far",
  VeryFar = "VeryFar",
}

export function getTransitDistanceBucket(km: number): TransitDistanceBucket {
  if (km <= TRANSIT_DISTANCE_BUCKET_BREAKPOINTS.near) {
    return TransitDistanceBucket.Near;
  }
  if (km <= TRANSIT_DISTANCE_BUCKET_BREAKPOINTS.moderate) {
    return TransitDistanceBucket.Moderate;
  }
  if (km <= TRANSIT_DISTANCE_BUCKET_BREAKPOINTS.far) {
    return TransitDistanceBucket.Far;
  }
  return TransitDistanceBucket.VeryFar;
}

const TRANSIT_DISTANCE_COLOR_MAP: Record<TransitDistanceBucket, string> = {
  [TransitDistanceBucket.Near]: TRANSIT_DISTANCE_BUCKET_COLORS.near,
  [TransitDistanceBucket.Moderate]: TRANSIT_DISTANCE_BUCKET_COLORS.moderate,
  [TransitDistanceBucket.Far]: TRANSIT_DISTANCE_BUCKET_COLORS.far,
  [TransitDistanceBucket.VeryFar]: TRANSIT_DISTANCE_BUCKET_COLORS.veryFar,
};

export function transitDistanceToColor(km: number | null): string {
  if (km === null) {
    return TRANSIT_DISTANCE_BUCKET_COLORS.noData;
  }
  return TRANSIT_DISTANCE_COLOR_MAP[getTransitDistanceBucket(km)];
}
