import { METROS } from "../../constants/metros";
import { TOWNSHIP_AREA_DEFINITIONS } from "../../constants/townships";

/**
 * Builds a short, static, plain-text summary of the `gauteng-spatial-legacy`
 * dataset's scale — metro count, recognised township area count, total
 * selected job centres — for grounding an LLM system prompt.
 * @returns A single paragraph of plain text.
 * @remarks Deliberately reports counts, not per-feature figures: the
 * underlying GeoJSON (town-level drive times, transit stop names) is
 * megabytes of coordinate data, far past what's practical to include in a
 * prompt on Cloudflare's free Workers AI tier. An LLM grounded on this
 * summary can describe the dataset's shape and methodology, but must be
 * told (see the system prompt this feeds into) that it can't look up a
 * specific place's numbers — that's what the map and the Places panel are for.
 * @example
 * buildGautengDatasetSummary();
 * // "The gauteng-spatial-legacy dataset covers 9 Gauteng metros, ..."
 */
export function buildGautengDatasetSummary(): string {
  const jobCenterCount = METROS.reduce(
    (total, metro) => total + metro.jobCenterCount,
    0,
  );
  const metroNames = METROS.map((metro) => metro.shortName).join(", ");
  return (
    `The gauteng-spatial-legacy dataset covers ${METROS.length} Gauteng metros ` +
    `(${metroNames}), with ${TOWNSHIP_AREA_DEFINITIONS.length} recognised township areas ` +
    `and ${jobCenterCount} selected job centres used as drive-time destinations. ` +
    "Transit coverage spans Gautrain rail and bus, PRASA commuter rail, and the " +
    "A Re Yeng, Rea Vaya and Ekurhuleni IRPTN bus rapid transit networks."
  );
}
