import type { Classification } from "../types/layer";

/**
 * Resolves a feature property through a `Classification` to its style output value.
 * @param classification - Graduated (numeric range) or categorized (exact match) rules.
 * @param properties - The feature's properties, as passed to a Leaflet `styleFn`.
 * @returns The matching stop's `value`, or `classification.fallback` when the
 *   property is missing, the wrong type, or matches no stop.
 * @example
 * const color = resolveClassification(style.colorClassification, feature.properties);
 */
export function resolveClassification<T>(
  classification: Classification<T>,
  properties: Record<string, unknown> | null | undefined,
): T {
  const raw = properties?.[classification.propertyKey];

  if (classification.kind === "graduated") {
    if (typeof raw !== "number") {
      return classification.fallback;
    }
    const sortedStops = [...classification.stops].sort((a, b) => a.max - b.max);
    const stop = sortedStops.find((s) => raw <= s.max);
    return stop?.value ?? sortedStops.at(-1)?.value ?? classification.fallback;
  }

  if (typeof raw !== "string") {
    return classification.fallback;
  }
  const stop = classification.stops.find((s) => s.match === raw);
  return stop?.value ?? classification.fallback;
}
