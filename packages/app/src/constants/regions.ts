/** The kind of geography a region represents. */
export type RegionKind = "province" | "national" | "custom";

/**
 * A geographic region the data pipeline produces one dataset for.
 * @remarks `id` drives the region's output directory
 *   (`packages/web/public/data/<id>/`) and the URLs `@stratum/web` fetches
 *   data from.
 */
export interface RegionDefinition {
  id: string;
  label: string;
  kind: RegionKind;
}

/**
 * The regions covered by this reference implementation.
 * @remarks Currently a single entry — `gauteng` — but the data pipeline and
 *   `@stratum/web` are written to loop over however many are configured here.
 */
export const REGIONS: readonly RegionDefinition[] = [
  { id: "gauteng", label: "Gauteng", kind: "province" },
] as const satisfies readonly RegionDefinition[];

/** Looks up a region's definition by id, or `undefined` if `id` isn't configured. */
export function getRegionDefinition(id: string): RegionDefinition | undefined {
  return REGIONS.find((region) => region.id === id);
}
