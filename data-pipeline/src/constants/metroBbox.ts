import type { MetroId } from "@buffer-zones/shared";

// (south, west, north, east). Generous enough to include Midrand/Ivory
// Park's Gautrain/PRASA infrastructure just outside the Johannesburg boundary.
export const METRO_BBOX: Record<MetroId, string> = {
  tshwane: "-25.95,28.05,-25.55,28.40",
  johannesburg: "-26.55,27.65,-25.85,28.35",
};

export function getMetroBbox(metroId: MetroId): string {
  return METRO_BBOX[metroId];
}
