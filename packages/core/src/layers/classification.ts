import type { Classification, GraduatedClassification } from "../types/layer";

/**
 * Cache of each graduated classification's stops sorted by `max`, keyed by
 * object identity. A layer's `Classification` object is a stable reference
 * reused across every feature's `styleFn` call, so this avoids re-sorting
 * the same stops on every single feature of a layer.
 */
const sortedStopsCache = new WeakMap<object, unknown[]>();

function getSortedStops<T>(
  classification: GraduatedClassification<T>,
): GraduatedClassification<T>["stops"] {
  const cached = sortedStopsCache.get(classification);
  if (cached) {
    return cached as GraduatedClassification<T>["stops"];
  }
  const sorted = [...classification.stops].sort((a, b) => a.max - b.max);
  sortedStopsCache.set(classification, sorted);
  return sorted;
}

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
    const sortedStops = getSortedStops(classification);
    const stop = sortedStops.find((s) => raw <= s.max);
    return stop?.value ?? sortedStops.at(-1)?.value ?? classification.fallback;
  }

  if (typeof raw !== "string") {
    return classification.fallback;
  }
  const stop = classification.stops.find((s) => s.match === raw);
  return stop?.value ?? classification.fallback;
}
