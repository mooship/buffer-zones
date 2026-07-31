import type { MetroId } from "@buffer-zones/shared";

// (south, west, north, east). Generous enough to include Midrand/Ivory
// Park's Gautrain/PRASA infrastructure just outside the Johannesburg boundary.
export const METRO_BBOX: Record<MetroId, string> = {
  tshwane: "-25.95,28.05,-25.55,28.40",
  johannesburg: "-26.55,27.65,-25.85,28.35",
  ekurhuleni: "-26.45,28.10,-25.95,28.65",
  emfuleni: "-26.79929,27.56909,-26.41898,28.02492",
  midvaal: "-26.92383,27.86908,-26.33516,28.40685",
  lesedi: "-26.67601,28.17947,-26.17224,28.86129",
  "mogale-city": "-26.21321,27.42522,-25.79592,27.94085",
  "rand-west-city": "-26.61774,27.46589,-26.05110,27.82447",
  "merafong-city": "-26.64947,27.15634,-26.08917,27.62991",
};

export function getMetroBbox(metroId: MetroId): string {
  return METRO_BBOX[metroId];
}

// Gautrain, Gautrain Bus and PRASA are real Gauteng-wide networks that run
// through more than one metro (e.g. Gautrain rail crosses Tshwane,
// Ekurhuleni's OR Tambo, and Johannesburg). Fetching them per metro bbox
// clips the line at that metro's boundary, so it looks severed when viewed
// from the other metro even though the real network is continuous. This
// union of every metro bbox is used to fetch those shared networks once,
// whole, rather than as metro-clipped fragments.
interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

function parseBbox(box: string): Bbox {
  const parts = box.split(",").map(Number);
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid bbox string: ${box}`);
  }
  const [south, west, north, east] = parts as [number, number, number, number];
  return { south, west, north, east };
}

export function getSharedTransitBbox(): string {
  const boxes = Object.values(METRO_BBOX).map(parseBbox);
  const south = Math.min(...boxes.map((box) => box.south));
  const west = Math.min(...boxes.map((box) => box.west));
  const north = Math.max(...boxes.map((box) => box.north));
  const east = Math.max(...boxes.map((box) => box.east));
  return `${south},${west},${north},${east}`;
}
