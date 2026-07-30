import type { MetroId } from "./metros";

export type TownshipAreaSelectionBasis =
  | "census-main-place"
  | "named-sub-places";

export type TownshipAreaLabelPriority = "primary" | "secondary";

export interface TownshipAreaDefinition {
  id: string;
  name: string;
  metroId: MetroId;
  selectionBasis: TownshipAreaSelectionBasis;
  labelPriority: TownshipAreaLabelPriority;
  labelOffset?: readonly [number, number];
  censusMainPlaceCodes?: readonly string[];
  subPlaceNamePrefixes?: readonly string[];
  excludedSubPlaceNames?: readonly string[];
}

type TownshipAreaDefinitionInput = Omit<TownshipAreaDefinition, "metroId">;

const TSHWANE_TOWNSHIP_AREA_DEFINITIONS: readonly TownshipAreaDefinitionInput[] =
  [
    {
      id: "atteridgeville",
      name: "Atteridgeville",
      selectionBasis: "census-main-place",
      labelPriority: "primary",
      censusMainPlaceCodes: ["799057"],
    },
    {
      id: "bosplaas-mathabe",
      name: "Bosplaas Mathabe",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799001"],
    },
    {
      id: "dilopye",
      name: "Dilopye",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799010"],
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
      id: "hebron",
      name: "Hebron",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799034"],
    },
    {
      id: "kekana-garden",
      name: "Kekana Garden",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799006"],
    },
    {
      id: "laudium",
      name: "Laudium",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799059"],
    },
    {
      id: "kudube",
      name: "Kudube",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Kudube"],
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
      id: "majaneng",
      name: "Majaneng",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799003"],
    },
    {
      id: "makanyaneng",
      name: "Makanyaneng",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799017"],
    },
    {
      id: "mamelodi",
      name: "Mamelodi",
      selectionBasis: "census-main-place",
      labelPriority: "primary",
      censusMainPlaceCodes: ["799045"],
    },
    {
      id: "mandela-village",
      name: "Mandela Village",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799019"],
    },
    {
      id: "marokolong",
      name: "Marokolong",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799007"],
    },
    {
      id: "mashemong",
      name: "Mashemong",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799002"],
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
      id: "ramotse",
      name: "Ramotse",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799005"],
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
      labelOffset: [0, 18],
      censusMainPlaceCodes: ["799058"],
    },
    {
      id: "plastic-view",
      name: "Plastic View",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Plastic View"],
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
      id: "soutpan",
      name: "Soutpan",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799013"],
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
      id: "tsebe",
      name: "Tsebe",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["799018"],
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

// Selected from the City of Johannesburg's Census 2011 sub-places (MN_CODE
// 798) using the same two rules as Tshwane's classification (see
// docs/data/johannesburg-area-classification.md): whole Census main places
// for township areas with their own distinct code, and named sub-place
// prefixes for historic townships whose main place is mixed (e.g. Randburg,
// Johannesburg, Roodepoort) and can't safely be included wholesale.
const JOHANNESBURG_TOWNSHIP_AREA_DEFINITIONS: readonly TownshipAreaDefinitionInput[] =
  [
    {
      id: "alexandra",
      name: "Alexandra",
      selectionBasis: "census-main-place",
      labelPriority: "primary",
      censusMainPlaceCodes: ["798027"],
    },
    {
      id: "klipspruit",
      name: "Klipspruit",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Klipspruit"],
    },
    {
      id: "protea-south",
      name: "Protea South",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Protea South"],
    },
    {
      id: "slovoville",
      name: "Slovoville",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Slovoville"],
    },
    {
      id: "soweto",
      name: "Soweto",
      selectionBasis: "census-main-place",
      labelPriority: "primary",
      censusMainPlaceCodes: ["798030"],
    },
    {
      id: "diepsloot",
      name: "Diepsloot",
      selectionBasis: "census-main-place",
      labelPriority: "primary",
      censusMainPlaceCodes: ["798003"],
    },
    {
      id: "orange-farm",
      name: "Orange Farm",
      selectionBasis: "census-main-place",
      labelPriority: "primary",
      censusMainPlaceCodes: ["798036"],
    },
    {
      id: "ivory-park",
      name: "Ivory Park",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798006"],
    },
    {
      id: "kaalfontein",
      name: "Kaalfontein",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798005"],
    },
    {
      id: "ebony-park",
      name: "Ebony Park",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798007"],
    },
    {
      id: "rabie-ridge",
      name: "Rabie Ridge",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798008"],
    },
    {
      id: "mayibuye",
      name: "Mayibuye",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798009"],
    },
    {
      id: "lenasia",
      name: "Lenasia",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798031"],
    },
    {
      id: "lenasia-south",
      name: "Lenasia South",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798034"],
    },
    {
      id: "lehae",
      name: "Lehae",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798032"],
    },
    {
      id: "vlakfontein",
      name: "Vlakfontein",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798033"],
    },
    {
      id: "ennerdale",
      name: "Ennerdale",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798035"],
    },
    {
      id: "drie-ziek",
      name: "Drie Ziek",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798037"],
    },
    {
      id: "stretford",
      name: "Stretford",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798038"],
    },
    {
      id: "lakeside",
      name: "Lakeside",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798039"],
    },
    {
      id: "lawley",
      name: "Lawley",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798040"],
    },
    {
      id: "kanana-park",
      name: "Kanana Park",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798041"],
    },
    {
      id: "poortjie",
      name: "Poortjie",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798042"],
    },
    {
      id: "kya-sand",
      name: "Kya Sand",
      selectionBasis: "census-main-place",
      labelPriority: "secondary",
      censusMainPlaceCodes: ["798023"],
    },
    {
      id: "cosmo-city",
      name: "Cosmo City",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Cosmo City"],
    },
    {
      id: "zandspruit",
      name: "Zandspruit",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Zandspruit"],
    },
    {
      id: "matholesville",
      name: "Matholesville",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Matholesville"],
    },
    {
      id: "eldorado-park",
      name: "Eldorado Park",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Eldorado Park"],
    },
    {
      id: "newclare",
      name: "Newclare",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Newclare"],
    },
    {
      id: "bosmont",
      name: "Bosmont",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Bosmont"],
    },
    {
      id: "riverlea",
      name: "Riverlea",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Riverlea"],
    },
    {
      id: "westbury",
      name: "Westbury",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Westbury"],
    },
    {
      id: "coronationville",
      name: "Coronationville",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Coronationville"],
    },
  ];

const EKURHULENI_TOWNSHIP_AREA_DEFINITIONS: readonly TownshipAreaDefinitionInput[] =
  [
    {
      id: "tembisa",
      name: "Tembisa",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Tembisa", "Thembisa"],
    },
    {
      id: "katlehong",
      name: "Katlehong",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Katlehong"],
    },
    {
      id: "thokoza",
      name: "Thokoza",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Thokoza", "Tokoza"],
    },
    {
      id: "vosloorus",
      name: "Vosloorus",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Vosloorus"],
    },
    {
      id: "daveyton",
      name: "Daveyton",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Daveyton"],
    },
    {
      id: "wattville",
      name: "Wattville",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Wattville"],
    },
    {
      id: "kwathema",
      name: "KwaThema",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["KwaThema"],
    },
    {
      id: "duduza",
      name: "Duduza",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Duduza"],
    },
    {
      id: "tsakane",
      name: "Tsakane",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Tsakane"],
    },
    {
      id: "etwatwa",
      name: "Etwatwa",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Etwatwa"],
    },
    {
      id: "zonkizizwe",
      name: "Zonkizizwe",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Zonkizizwe"],
    },
    {
      id: "langaville",
      name: "Langaville",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Langaville"],
    },
    {
      id: "actonville",
      name: "Actonville",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Actonville"],
    },
    {
      id: "reiger-park",
      name: "Reiger Park",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Reiger Park"],
    },
    {
      id: "chief-albert-luthuli-park",
      name: "Chief Albert Luthuli Park",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Chief Albert Luthuli Park"],
    },
    {
      id: "clayville",
      name: "Clayville",
      selectionBasis: "named-sub-places",
      labelPriority: "primary",
      subPlaceNamePrefixes: ["Clayville"],
    },
    {
      id: "makause",
      name: "Makause",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Makause"],
    },
    {
      id: "primrose",
      name: "Primrose",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Primrose"],
    },
    {
      id: "skoon-plaas",
      name: "Skoon Plaas",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Skoon Plaas", "Skoonplaas"],
    },
    {
      id: "joe-slovo-boksburg",
      name: "Joe Slovo",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Joe Slovo"],
    },
    {
      id: "ulana-park",
      name: "Ulana Park",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Ulana Park"],
    },
    {
      id: "hlahane",
      name: "Hlahane",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Hlahane"],
    },
    {
      id: "driefontein",
      name: "Driefontein",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Driefontein"],
    },
    {
      id: "crossroads-roodekop-extension-3",
      name: "Crossroads",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Crossroads", "Roodekop Extension 3"],
    },
    {
      id: "kalamazoo",
      name: "Kalamazoo",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Kalamazoo"],
    },
    {
      id: "duduza-north",
      name: "Duduza North",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Duduza North"],
    },
    {
      id: "emandleni",
      name: "Emandleni",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Emandleni"],
    },
    {
      id: "bapsfontein",
      name: "Bapsfontein",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Bapsfontein"],
    },
    {
      id: "breswol",
      name: "Breswol",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Breswol"],
    },
    {
      id: "dukathole",
      name: "Dukathole",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Dukathole"],
    },
    {
      id: "geluksdal",
      name: "Geluksdal",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Geluksdal"],
    },
    {
      id: "harry-gwala",
      name: "Harry Gwala",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Harry Gwala"],
    },
    {
      id: "holfontein",
      name: "Holfontein",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Holfontein"],
    },
    {
      id: "kanana",
      name: "Kanana",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Kanana"],
    },
    {
      id: "lindelani-village",
      name: "Lindelani Village",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Lindelani Village"],
    },
    {
      id: "thinasonke",
      name: "Thinasonke",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Thinasonke"],
    },
    {
      id: "tweefontein",
      name: "Tweefontein",
      selectionBasis: "named-sub-places",
      labelPriority: "secondary",
      subPlaceNamePrefixes: ["Tweefontein"],
    },
  ];

export const TOWNSHIP_AREA_DEFINITIONS: readonly TownshipAreaDefinition[] = [
  ...TSHWANE_TOWNSHIP_AREA_DEFINITIONS.map((definition) => ({
    ...definition,
    metroId: "tshwane" as const,
  })),
  ...JOHANNESBURG_TOWNSHIP_AREA_DEFINITIONS.map((definition) => ({
    ...definition,
    metroId: "johannesburg" as const,
  })),
  ...EKURHULENI_TOWNSHIP_AREA_DEFINITIONS.map((definition) => ({
    ...definition,
    metroId: "ekurhuleni" as const,
  })),
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
