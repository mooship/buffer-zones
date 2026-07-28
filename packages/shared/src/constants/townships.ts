export type TownshipAreaSelectionBasis =
  | "census-main-place"
  | "named-sub-places";

export type TownshipAreaLabelPriority = "primary" | "secondary";

export interface TownshipAreaDefinition {
  id: string;
  name: string;
  selectionBasis: TownshipAreaSelectionBasis;
  labelPriority: TownshipAreaLabelPriority;
  censusMainPlaceCodes?: readonly string[];
  subPlaceNamePrefixes?: readonly string[];
  excludedSubPlaceNames?: readonly string[];
}

export const TOWNSHIP_AREA_DEFINITIONS: readonly TownshipAreaDefinition[] = [
  {
    id: "atteridgeville",
    name: "Atteridgeville",
    selectionBasis: "census-main-place",
    labelPriority: "primary",
    censusMainPlaceCodes: ["799057"],
  },
  {
    id: "eersterust",
    name: "Eersterust",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799046"],
  },
  {
    id: "ekangala",
    name: "Ekangala",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799055"],
    excludedSubPlaceNames: ["Ekandustria"],
  },
  {
    id: "ga-rankuwa",
    name: "Ga-Rankuwa",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799035", "799036"],
  },
  {
    id: "laudium",
    name: "Laudium",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799059"],
  },
  {
    id: "lotus-gardens",
    name: "Lotus Gardens",
    selectionBasis: "named-sub-places",
    labelPriority: "secondary",
    subPlaceNamePrefixes: ["Lotus Gardens"],
  },
  {
    id: "mabopane",
    name: "Mabopane",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799016"],
  },
  {
    id: "mamelodi",
    name: "Mamelodi",
    selectionBasis: "census-main-place",
    labelPriority: "primary",
    censusMainPlaceCodes: ["799045"],
  },
  {
    id: "nellmapius",
    name: "Nellmapius",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799054"],
  },
  {
    id: "new-eersterus",
    name: "New Eersterus",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799012"],
  },
  {
    id: "olievenhoutbosch",
    name: "Olievenhoutbosch",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799078"],
    subPlaceNamePrefixes: ["Olievenhoutbos"],
  },
  {
    id: "refilwe",
    name: "Refilwe",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799049"],
  },
  {
    id: "rethabiseng",
    name: "Rethabiseng",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799056"],
  },
  {
    id: "saulsville",
    name: "Saulsville",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799058"],
  },
  {
    id: "soshanguve",
    name: "Soshanguve",
    selectionBasis: "census-main-place",
    labelPriority: "primary",
    censusMainPlaceCodes: ["799014"],
    excludedSubPlaceNames: ["Tswaing Nature Reserve"],
  },
  {
    id: "stinkwater",
    name: "Stinkwater",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799011"],
  },
  {
    id: "suurman",
    name: "Suurman",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799009"],
  },
  {
    id: "temba",
    name: "Temba",
    selectionBasis: "census-main-place",
    labelPriority: "primary",
    censusMainPlaceCodes: ["799008"],
  },
  {
    id: "winterveld",
    name: "Winterveld",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799015"],
  },
  {
    id: "zithobeni",
    name: "Zithobeni",
    selectionBasis: "census-main-place",
    labelPriority: "secondary",
    censusMainPlaceCodes: ["799062"],
  },
];

export const TOWNSHIP_GROUPS = TOWNSHIP_AREA_DEFINITIONS.map(
  (area) => area.name,
);

export function getTownshipAreaDefinition(
  name: string,
  censusId?: string,
): TownshipAreaDefinition | undefined {
  return TOWNSHIP_AREA_DEFINITIONS.find((area) => {
    if (area.excludedSubPlaceNames?.includes(name)) {
      return false;
    }
    if (area.subPlaceNamePrefixes?.some((prefix) => name.startsWith(prefix))) {
      return true;
    }
    if (name.startsWith(area.name)) {
      return true;
    }
    return area.censusMainPlaceCodes?.some((code) =>
      censusId?.startsWith(code),
    );
  });
}

export function getTownshipGroup(
  name: string,
  censusId?: string,
): string | undefined {
  return getTownshipAreaDefinition(name, censusId)?.name;
}
