export type MetroId =
  | "tshwane"
  | "johannesburg"
  | "ekurhuleni"
  | "emfuleni"
  | "midvaal"
  | "lesedi"
  | "mogale-city"
  | "rand-west-city"
  | "merafong-city";

export interface MetroDefinition {
  id: MetroId;
  name: string;
  shortName: string;
  municipalityCodes: readonly number[];
  center: { lat: number; lon: number };
  zoom: number;
  // Must match `getJobCentersForMetro(id).length` in
  // data-pipeline/src/constants/jobCenters.ts — kept here too since the web
  // app's copy (see EvidenceSummary) needs the count but can't import from
  // the Node-only data-pipeline package.
  jobCenterCount: number;
}

export const METROS: readonly MetroDefinition[] = [
  {
    id: "tshwane",
    name: "City of Tshwane",
    shortName: "Tshwane",
    municipalityCodes: [799],
    center: { lat: -25.7449, lon: 28.1878 },
    zoom: 10,
    jobCenterCount: 8,
  },
  {
    id: "johannesburg",
    name: "City of Johannesburg",
    shortName: "Johannesburg",
    municipalityCodes: [798],
    center: { lat: -26.2041, lon: 28.0473 },
    zoom: 10,
    jobCenterCount: 8,
  },
  {
    id: "ekurhuleni",
    name: "City of Ekurhuleni",
    shortName: "Ekurhuleni",
    municipalityCodes: [797],
    center: { lat: -26.175, lon: 28.29 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "emfuleni",
    name: "Emfuleni Local Municipality",
    shortName: "Emfuleni",
    municipalityCodes: [760],
    center: { lat: -26.67, lon: 27.86 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "midvaal",
    name: "Midvaal Local Municipality",
    shortName: "Midvaal",
    municipalityCodes: [761],
    center: { lat: -26.585, lon: 28.0785 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "lesedi",
    name: "Lesedi Local Municipality",
    shortName: "Lesedi",
    municipalityCodes: [762],
    center: { lat: -26.4823, lon: 28.4146 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "mogale-city",
    name: "Mogale City Local Municipality",
    shortName: "Mogale City",
    municipalityCodes: [763],
    center: { lat: -26.063, lon: 27.7376 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "rand-west-city",
    name: "Rand West City Local Municipality",
    shortName: "Rand West City",
    municipalityCodes: [764, 765],
    center: { lat: -26.26, lon: 27.6648 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "merafong-city",
    name: "Merafong City Local Municipality",
    shortName: "Merafong City",
    municipalityCodes: [766],
    center: { lat: -26.4095, lon: 27.4034 },
    zoom: 10,
    jobCenterCount: 6,
  },
] as const satisfies readonly MetroDefinition[];

export function getMetroDefinition(id: MetroId): MetroDefinition {
  const metro = METROS.find((candidate) => candidate.id === id);
  if (!metro) {
    throw new Error(`Unknown metro id: ${id}`);
  }
  return metro;
}
