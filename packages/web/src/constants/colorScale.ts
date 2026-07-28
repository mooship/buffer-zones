export const COMMUTE_BUCKET_BREAKPOINTS = {
  short: 20,
  moderate: 40,
  long: 60,
} as const;

export const COMMUTE_BUCKET_COLORS = {
  short: "#7A9B6E",
  moderate: "#C9A227",
  long: "#D6703F",
  veryLong: "#C1502E",
  noData: "#8A93A5",
} as const;

export const TRANSIT_DISTANCE_BUCKET_BREAKPOINTS = {
  near: 1,
  moderate: 3,
  far: 8,
} as const;

export const TRANSIT_DISTANCE_BUCKET_COLORS = {
  near: "#CFE3F5",
  moderate: "#7FB2E5",
  far: "#3673B8",
  veryFar: "#123F6E",
  noData: "#8A93A5",
} as const;
