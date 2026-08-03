/** A geocoded place returned from a location search. */
export interface LocationSearchResult {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** The place's bounding box, as `[[south, west], [north, east]]`, if the geocoder provided one. */
  bounds?: [[number, number], [number, number]];
}

interface NominatimLocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}

interface NominatimReverseError {
  error: string;
}

function parseBounds(
  boundingbox: NominatimLocationResult["boundingbox"],
): LocationSearchResult["bounds"] {
  if (boundingbox?.length !== 4) {
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

function toLocationSearchResult(
  item: NominatimLocationResult,
): LocationSearchResult | null {
  const latitude = Number.parseFloat(item.lat);
  const longitude = Number.parseFloat(item.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const bounds = parseBounds(item.boundingbox);
  const result: LocationSearchResult = {
    id: String(item.place_id),
    label: item.display_name,
    latitude,
    longitude,
  };

  if (bounds) {
    result.bounds = bounds;
  }

  return result;
}

/**
 * Searches OpenStreetMap Nominatim for places matching `query`.
 * @param query - Free-text place search query. An empty/whitespace-only
 *   query resolves to an empty array without making a request.
 * @param signal - Optional `AbortSignal` to cancel the request.
 * @returns Up to 6 matching places, each with parsed coordinates and, where
 *   available, a bounding box.
 * @throws If the Nominatim request returns a non-2xx response.
 */
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
    .map(toLocationSearchResult)
    .filter((item): item is LocationSearchResult => item !== null);
}

/**
 * Resolves the place at `latitude`/`longitude` via OpenStreetMap Nominatim's
 * reverse-geocoding endpoint.
 * @param signal - Optional `AbortSignal` to cancel the request.
 * @returns The matching place, or `null` if Nominatim can't geocode the
 *   coordinates (a `200` response with an `error` field, not a failure).
 * @throws If the Nominatim request returns a non-2xx response.
 */
export async function fetchReverseGeocodeResult(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<LocationSearchResult | null> {
  const searchParams = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`,
    {
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }

  const payload = (await response.json()) as
    | NominatimLocationResult
    | NominatimReverseError;

  if ("error" in payload) {
    return null;
  }

  return toLocationSearchResult(payload);
}

/** A pluggable place-search / reverse-geocoding backend. */
export interface GeocoderProvider {
  search(query: string, signal?: AbortSignal): Promise<LocationSearchResult[]>;
  reverse(
    latitude: number,
    longitude: number,
    signal?: AbortSignal,
  ): Promise<LocationSearchResult | null>;
}

/** The default `GeocoderProvider`, backed by OpenStreetMap Nominatim. */
export const nominatimGeocoderProvider: GeocoderProvider = {
  search: fetchLocationSearchResults,
  reverse: fetchReverseGeocodeResult,
};
