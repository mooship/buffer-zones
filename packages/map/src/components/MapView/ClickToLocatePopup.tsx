import type { LatLng } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Popup, useMapEvents } from "react-leaflet";
import { fetchReverseGeocodeResult } from "../../data/locationSearch";

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
  const controllerRef = useRef<AbortController | null>(null);

  useMapEvents({
    click(event) {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { latlng } = event;

      setState({ latlng, loading: true, label: null });

      fetchReverseGeocodeResult(latlng.lat, latlng.lng, controller.signal)
        .then(
          (result) => result?.label ?? null,
          () => null,
        )
        .then((label) => {
          if (!controller.signal.aborted) {
            setState({ latlng, loading: false, label });
          }
        });
    },
  });

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

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
