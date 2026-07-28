export const TOWNSHIP_GROUPS = [
  "Atteridgeville",
  "Eersterust",
  "Ga-Rankuwa",
  "Laudium",
  "Mabopane",
  "Mamelodi",
  "Soshanguve",
  "Temba",
] as const;

const TOWNSHIP_MAIN_PLACE_CODES: Record<
  (typeof TOWNSHIP_GROUPS)[number],
  string
> = {
  Atteridgeville: "799057",
  Eersterust: "799046",
  "Ga-Rankuwa": "799035",
  Laudium: "799059",
  Mabopane: "799016",
  Mamelodi: "799045",
  Soshanguve: "799014",
  Temba: "799008",
};

const TOWNSHIP_LABEL_FEATURES = new Set([
  "Atteridgeville SP",
  "Eersterust Ext 2",
  "Ga-Rankuwa SP",
  "Laudium SP",
  "Mabopane SP",
  "Mamelodi SP",
  "Soshanguve A",
  "Temba Unit 1",
]);

export function getTownshipGroup(
  name: string,
  censusId?: string,
): string | undefined {
  return TOWNSHIP_GROUPS.find(
    (township) =>
      name.startsWith(township) ||
      censusId?.startsWith(TOWNSHIP_MAIN_PLACE_CODES[township]),
  );
}

export function isTownshipLabelFeature(name: string): boolean {
  return TOWNSHIP_LABEL_FEATURES.has(name);
}
