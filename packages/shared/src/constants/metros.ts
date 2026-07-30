export type MetroId = "tshwane" | "johannesburg" | "ekurhuleni";

export interface MetroDefinition {
  id: MetroId;
  name: string;
  shortName: string;
  municipalityCode: number;
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
    municipalityCode: 799,
    center: { lat: -25.7449, lon: 28.1878 },
    zoom: 10,
    jobCenterCount: 8,
  },
  {
    id: "johannesburg",
    name: "City of Johannesburg",
    shortName: "Johannesburg",
    municipalityCode: 798,
    center: { lat: -26.2041, lon: 28.0473 },
    zoom: 10,
    jobCenterCount: 8,
  },
  {
    id: "ekurhuleni",
    name: "City of Ekurhuleni",
    shortName: "Ekurhuleni",
    municipalityCode: 797,
    center: { lat: -26.175, lon: 28.29 },
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
