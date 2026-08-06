/** Identifier for one of the nine Gauteng municipalities the SDK's reference domain covers. */
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

/** Metadata describing one Gauteng municipality used to build and render the `gauteng` region's dataset. */
export interface MetroDefinition {
  id: MetroId;
  name: string;
  shortName: string;
  regionId: string;
  /**
   * Census 2011 municipality codes, used by the data pipeline to filter the
   * national boundary shapefile down to this metro's features (see
   * `filterFeaturesByMunicipality` in `data-pipeline/src/adapters/boundaries.ts`).
   */
  municipalityCodes: readonly number[];
  /** The metro's approximate map center. */
  center: { lat: number; lon: number };
  /** A reasonable map zoom level for viewing this metro alone. */
  zoom: number;
  /**
   * Hand-maintained mirror of `getJobCentersForMetro(id).length` in
   * `data-pipeline/src/constants/jobCenters.ts`. `data-pipeline`'s
   * `assertMetroSetup` cross-checks the two on every pipeline run and throws
   * on drift, so an edit to one that isn't kept in sync with the other fails
   * loudly rather than silently under/over-counting a metro's job centres.
   */
  jobCenterCount: number;
}

/** The nine Gauteng municipalities covered by the `gauteng-spatial-legacy` domain. */
export const METROS: readonly MetroDefinition[] = [
  {
    id: "tshwane",
    name: "City of Tshwane",
    shortName: "Tshwane",
    regionId: "gauteng",
    municipalityCodes: [799],
    center: { lat: -25.7449, lon: 28.1878 },
    zoom: 10,
    jobCenterCount: 8,
  },
  {
    id: "johannesburg",
    name: "City of Johannesburg",
    shortName: "Johannesburg",
    regionId: "gauteng",
    municipalityCodes: [798],
    center: { lat: -26.2041, lon: 28.0473 },
    zoom: 10,
    jobCenterCount: 8,
  },
  {
    id: "ekurhuleni",
    name: "City of Ekurhuleni",
    shortName: "Ekurhuleni",
    regionId: "gauteng",
    municipalityCodes: [797],
    center: { lat: -26.175, lon: 28.29 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "emfuleni",
    name: "Emfuleni Local Municipality",
    shortName: "Emfuleni",
    regionId: "gauteng",
    municipalityCodes: [760],
    center: { lat: -26.67, lon: 27.86 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "midvaal",
    name: "Midvaal Local Municipality",
    shortName: "Midvaal",
    regionId: "gauteng",
    municipalityCodes: [761],
    center: { lat: -26.585, lon: 28.0785 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "lesedi",
    name: "Lesedi Local Municipality",
    shortName: "Lesedi",
    regionId: "gauteng",
    municipalityCodes: [762],
    center: { lat: -26.4823, lon: 28.4146 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "mogale-city",
    name: "Mogale City Local Municipality",
    shortName: "Mogale City",
    regionId: "gauteng",
    municipalityCodes: [763],
    center: { lat: -26.063, lon: 27.7376 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "rand-west-city",
    name: "Rand West City Local Municipality",
    shortName: "Rand West City",
    regionId: "gauteng",
    municipalityCodes: [764, 765],
    center: { lat: -26.26, lon: 27.6648 },
    zoom: 10,
    jobCenterCount: 6,
  },
  {
    id: "merafong-city",
    name: "Merafong City Local Municipality",
    shortName: "Merafong City",
    regionId: "gauteng",
    municipalityCodes: [766],
    center: { lat: -26.4095, lon: 27.4034 },
    zoom: 10,
    jobCenterCount: 6,
  },
] as const satisfies readonly MetroDefinition[];

/**
 * Looks up a metro's definition by id.
 * @throws If `id` isn't one of `METROS`'s ids.
 */
export function getMetroDefinition(id: MetroId): MetroDefinition {
  const metro = METROS.find((candidate) => candidate.id === id);
  if (!metro) {
    throw new Error(`Unknown metro id: ${id}`);
  }
  return metro;
}
