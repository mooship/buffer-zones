export type RegionKind = "province" | "national" | "custom";

export interface RegionDefinition {
  id: string;
  label: string;
  kind: RegionKind;
}

export const REGIONS: readonly RegionDefinition[] = [
  { id: "gauteng", label: "Gauteng", kind: "province" },
] as const satisfies readonly RegionDefinition[];

export function getRegionDefinition(id: string): RegionDefinition | undefined {
  return REGIONS.find((region) => region.id === id);
}
