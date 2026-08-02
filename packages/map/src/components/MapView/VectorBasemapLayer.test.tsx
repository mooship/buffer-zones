import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const layerMocks = vi.hoisted(() => ({
  maplibreGL: vi.fn(),
}));

vi.mock("leaflet", () => ({
  maplibreGL: layerMocks.maplibreGL,
}));

vi.mock("@maplibre/maplibre-gl-leaflet", () => ({}));

const fakeMap = { id: "fake-map" };
vi.mock("react-leaflet", () => ({
  useMap: () => fakeMap,
}));

import { VectorBasemapLayer } from "./VectorBasemapLayer";

describe("VectorBasemapLayer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lazily creates a MapLibre GL layer with the given style and adds it to the map", async () => {
    const layer = { addTo: vi.fn(), remove: vi.fn() };
    layerMocks.maplibreGL.mockReturnValue(layer);

    render(<VectorBasemapLayer styleUrl="https://example.com/style.json" />);

    await waitFor(() => {
      expect(layerMocks.maplibreGL).toHaveBeenCalledWith({
        style: "https://example.com/style.json",
      });
    });
    expect(layer.addTo).toHaveBeenCalledWith(fakeMap);
  });

  it("removes the previous layer and creates a new one when styleUrl changes", async () => {
    const firstLayer = { addTo: vi.fn(), remove: vi.fn() };
    const secondLayer = { addTo: vi.fn(), remove: vi.fn() };
    layerMocks.maplibreGL
      .mockReturnValueOnce(firstLayer)
      .mockReturnValueOnce(secondLayer);

    const { rerender } = render(
      <VectorBasemapLayer styleUrl="https://example.com/light.json" />,
    );
    await waitFor(() => expect(firstLayer.addTo).toHaveBeenCalled());

    rerender(<VectorBasemapLayer styleUrl="https://example.com/dark.json" />);

    await waitFor(() =>
      expect(secondLayer.addTo).toHaveBeenCalledWith(fakeMap),
    );
    expect(firstLayer.remove).toHaveBeenCalled();
  });

  it("removes the layer on unmount", async () => {
    const layer = { addTo: vi.fn(), remove: vi.fn() };
    layerMocks.maplibreGL.mockReturnValue(layer);

    const { unmount } = render(
      <VectorBasemapLayer styleUrl="https://example.com/style.json" />,
    );
    await waitFor(() => expect(layer.addTo).toHaveBeenCalled());

    unmount();

    expect(layer.remove).toHaveBeenCalled();
  });
});
