export interface LocationSearchResult {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  bounds?: [[number, number], [number, number]];
}

interface NominatimLocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}

function parseBounds(
  boundingbox: NominatimLocationResult["boundingbox"],
): LocationSearchResult["bounds"] {
  if (!boundingbox || boundingbox.length !== 4) {
    return undefined;
  }

  const south = Number.parseFloat(boundingbox[0]);
  const north = Number.parseFloat(boundingbox[1]);
  const west = Number.parseFloat(boundingbox[2]);
  const east = Number.parseFloat(boundingbox[3]);

  if (
    Number.isNaN(south) ||
    Number.isNaN(north) ||
    Number.isNaN(west) ||
    Number.isNaN(east)
  ) {
    return undefined;
  }

  return [
    [south, west],
    [north, east],
  ];
}

export async function fetchLocationSearchResults(
  query: string,
  signal?: AbortSignal,
): Promise<LocationSearchResult[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return [];
  }

  const searchParams = new URLSearchParams({
    q: trimmedQuery,
    format: "jsonv2",
    limit: "6",
    addressdetails: "0",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
    {
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Location search failed: ${response.status}`);
  }

  const payload = (await response.json()) as NominatimLocationResult[];

  return payload
    .map((item) => {
      const latitude = Number.parseFloat(item.lat);
      const longitude = Number.parseFloat(item.lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
      }

      return {
        id: String(item.place_id),
        label: item.display_name,
        latitude,
        longitude,
        bounds: parseBounds(item.boundingbox),
      } satisfies LocationSearchResult;
    })
    .filter((item): item is LocationSearchResult => item !== null);
}
