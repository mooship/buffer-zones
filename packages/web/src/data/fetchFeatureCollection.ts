import type { FeatureCollection } from "geojson";

export async function fetchFeatureCollection(
  url: string,
): Promise<FeatureCollection> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as FeatureCollection;
}
