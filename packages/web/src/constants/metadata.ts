export const APP_NAME = "Buffer Zones";
export const DATA_AS_OF = "2026-07-28";
export const REPOSITORY_URL = "https://github.com/mooship/buffer-zones";

export function getAppTagline(metroShortName: string): string {
  return `How ${metroShortName}'s spatial legacy shapes access to work`;
}

export const DATA_SOURCES = [
  "Boundaries: Statistics South Africa Census 2011 sub-places",
  "Transit: OpenStreetMap contributors, City of Tshwane, City of Johannesburg",
  "Modeled car routing: OSRM",
];
