import type { MetroId } from "@buffer-zones/shared";

// Bounding boxes (south, west, north, east) for each metro's Overpass API
// queries. Kept generous enough to include feeder infrastructure just
// outside the Census municipality boundary (e.g. Midrand/Ivory Park sits at
// Johannesburg's northern edge but its Gautrain/PRASA infrastructure is
// still relevant to it).
export const METRO_BBOX: Record<MetroId, string> = {
  tshwane: "-25.95,28.05,-25.55,28.40",
  johannesburg: "-26.55,27.65,-25.85,28.35",
};

export function getMetroBbox(metroId: MetroId): string {
  return METRO_BBOX[metroId];
}
