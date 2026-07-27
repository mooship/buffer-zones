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
] as const satisfies readonly JobCenter[];
