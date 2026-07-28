export interface JobCenter {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const JOB_CENTERS = [
  { id: "pretoria-cbd", name: "Pretoria CBD", lat: -25.7461, lon: 28.1881 },
  { id: "menlyn", name: "Menlyn", lat: -25.7825, lon: 28.2775 },
  { id: "centurion", name: "Centurion", lat: -25.8603, lon: 28.1894 },
  { id: "rosslyn", name: "Rosslyn", lat: -25.6167, lon: 28.0833 },
  { id: "hatfield", name: "Hatfield", lat: -25.7487, lon: 28.2323 },
  {
    id: "waterkloof-brooklyn",
    name: "Waterkloof/Brooklyn",
    lat: -25.7677,
    lon: 28.2361,
  },
  // Included even though these sit outside Tshwane: the Gautrain corridor's
  // real value for Pretoria is largely commuting to Johannesburg job centers.
  // Drive time (not rail time) is what OSRM computes here — this doesn't
  // capture the Gautrain's actual rail-speed advantage, only whether driving
  // to Joburg is competitive with local options for townships along the
  // corridor (see docs/superpowers/specs/2026-07-27-buffer-zones-v1-design.md).
  { id: "sandton", name: "Sandton", lat: -26.1076, lon: 28.0567 },
  { id: "rosebank", name: "Rosebank", lat: -26.1467, lon: 28.0436 },
] as const satisfies readonly JobCenter[];
