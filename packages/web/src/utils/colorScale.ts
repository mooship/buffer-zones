import {
  COMMUTE_BUCKET_BREAKPOINTS,
  COMMUTE_BUCKET_COLORS,
} from "../constants/colorScale";

export enum CommuteBucket {
  Short = "Short",
  Moderate = "Moderate",
  Long = "Long",
  VeryLong = "VeryLong",
}

export function getCommuteBucket(minutes: number): CommuteBucket {
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.short) return CommuteBucket.Short;
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.moderate)
    return CommuteBucket.Moderate;
  if (minutes <= COMMUTE_BUCKET_BREAKPOINTS.long) return CommuteBucket.Long;
  return CommuteBucket.VeryLong;
}

const BUCKET_COLOR_MAP: Record<CommuteBucket, string> = {
  [CommuteBucket.Short]: COMMUTE_BUCKET_COLORS.short,
  [CommuteBucket.Moderate]: COMMUTE_BUCKET_COLORS.moderate,
  [CommuteBucket.Long]: COMMUTE_BUCKET_COLORS.long,
  [CommuteBucket.VeryLong]: COMMUTE_BUCKET_COLORS.veryLong,
};

export function commuteMinutesToColor(minutes: number | null): string {
  if (minutes === null) return COMMUTE_BUCKET_COLORS.noData;
  return BUCKET_COLOR_MAP[getCommuteBucket(minutes)];
}
