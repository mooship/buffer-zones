import type { MetroId } from "@buffer-zones/shared";

export interface JobCenter {
  id: string;
  name: string;
  lat: number;
  lon: number;
  metroId?: MetroId;
}

export const JOB_CENTERS = [
  {
    id: "pretoria-cbd",
    name: "Pretoria CBD",
    lat: -25.7461,
    lon: 28.1881,
    metroId: "tshwane",
  },
  {
    id: "menlyn",
    name: "Menlyn",
    lat: -25.7825,
    lon: 28.2775,
    metroId: "tshwane",
  },
  {
    id: "centurion",
    name: "Centurion",
    lat: -25.8603,
    lon: 28.1894,
    metroId: "tshwane",
  },
  {
    id: "rosslyn",
    name: "Rosslyn",
    lat: -25.6167,
    lon: 28.0833,
    metroId: "tshwane",
  },
  {
    id: "hatfield",
    name: "Hatfield",
    lat: -25.7487,
    lon: 28.2323,
    metroId: "tshwane",
  },
  {
    id: "waterkloof-brooklyn",
    name: "Waterkloof/Brooklyn",
    lat: -25.7677,
    lon: 28.2361,
    metroId: "tshwane",
  },
  {
    id: "johannesburg-cbd",
    name: "Johannesburg CBD",
    lat: -26.2041,
    lon: 28.0473,
    metroId: "johannesburg",
  },
  {
    id: "sandton",
    name: "Sandton",
    lat: -26.1076,
    lon: 28.0567,
    metroId: "johannesburg",
  },
  {
    id: "rosebank",
    name: "Rosebank",
    lat: -26.1467,
    lon: 28.0436,
    metroId: "johannesburg",
  },
  {
    id: "randburg",
    name: "Randburg",
    lat: -26.094,
    lon: 27.9761,
    metroId: "johannesburg",
  },
  {
    id: "roodepoort",
    name: "Roodepoort",
    lat: -26.1625,
    lon: 27.8727,
    metroId: "johannesburg",
  },
  {
    id: "midrand",
    name: "Midrand",
    lat: -25.9992,
    lon: 28.129,
    metroId: "johannesburg",
  },
] as const satisfies readonly JobCenter[];

export function getJobCentersForMetro(metroId: MetroId): JobCenter[] {
  return JOB_CENTERS.filter((jobCenter) => jobCenter.metroId === metroId);
}
