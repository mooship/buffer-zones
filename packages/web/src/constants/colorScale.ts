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

export const GAUTRAIN_DISTANCE_BUCKET_BREAKPOINTS = {
  near: 3,
  moderate: 8,
  far: 20,
} as const;

export const GAUTRAIN_DISTANCE_BUCKET_COLORS = {
  near: "#D9CBEF",
  moderate: "#B79BE0",
  far: "#8F5FD1",
  veryFar: "#5C2EA0",
  noData: "#8A93A5",
} as const;
