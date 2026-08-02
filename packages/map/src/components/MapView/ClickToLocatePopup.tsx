import type { LatLng } from "leaflet";
import { useState } from "react";
import { Popup, useMapEvents } from "react-leaflet";
import { fetchReverseGeocodeResult } from "../../data/locationSearch";
import { useAbortController } from "../../hooks/useAbortController";

interface ClickState {
  latlng: LatLng;
  loading: boolean;
  label: string | null;
}

/**
 * Reverse-geocodes the point a user clicks on the map background and shows
 * the result in a popup.
 * @remarks Must be rendered inside a `MapContainer`. Clicks on selectable
 *   features don't reach this component -- Leaflet path layers don't bubble
 *   click events to the map by default.
 */
export function ClickToLocatePopup() {
  const [state, setState] = useState<ClickState | null>(null);
  const { next } = useAbortController();

  useMapEvents({
    click(event) {
      const { latlng } = event;
      const signal = next();

      setState({ latlng, loading: true, label: null });

      fetchReverseGeocodeResult(latlng.lat, latlng.lng, signal)
        .then(
          (result) => result?.label ?? null,
          () => null,
        )
        .then((label) => {
          if (!signal.aborted) {
            setState({ latlng, loading: false, label });
          }
        });
    },
  });

  if (!state) {
    return null;
  }

  return (
    <Popup position={state.latlng}>
      {state.loading
        ? "Looking up address…"
        : (state.label ?? "No address found here.")}
    </Popup>
  );
}
