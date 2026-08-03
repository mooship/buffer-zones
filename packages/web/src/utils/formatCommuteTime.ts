/**
 * Formats a modelled commute time for display.
 * @param minutes - Minutes, or `null` if no time was computed.
 * @returns `"No data"` for `null`; `"<n> min"` under an hour; `"<h>h <m>min"` otherwise.
 */
export function formatCommuteTime(minutes: number | null): string {
  if (minutes === null) {
    return "No data";
  }
  const rounded = Math.round(minutes);
  if (rounded < 60) {
    return `${rounded} min`;
  }
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${hours}h ${remainder}min`;
}
