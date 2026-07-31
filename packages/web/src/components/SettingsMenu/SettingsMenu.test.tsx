import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchMocks = vi.hoisted(() => ({
  fetchLocationSearchResults: vi.fn(),
}));

vi.mock("../../data/locationSearch", () => ({
  fetchLocationSearchResults: searchMocks.fetchLocationSearchResults,
}));

import { SettingsMenu } from "./SettingsMenu";

describe("SettingsMenu", () => {
  beforeEach(() => {
    searchMocks.fetchLocationSearchResults.mockReset();
  });

  it("is closed by default and toggles open state from the trigger", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId("settings-menu-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("settings-menu-content"),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("settings-menu-content")).toBeInTheDocument();
  });

  it("closes when clicking outside of the menu container", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId("settings-menu-trigger");
    fireEvent.click(trigger);
    expect(screen.getByTestId("settings-menu-content")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("settings-menu-content"),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId("settings-menu-trigger");
    fireEvent.click(trigger);
    expect(screen.getByTestId("settings-menu-content")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("settings-menu-content"),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("passes through basemap and theme change actions", () => {
    const onBasemapChange = vi.fn();
    const onThemePreferenceChange = vi.fn();

    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={onBasemapChange}
        themePreference="system"
        onThemePreferenceChange={onThemePreferenceChange}
        onLocationSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    fireEvent.click(screen.getByTestId("basemap-option-satellite"));
    fireEvent.click(screen.getByTestId("theme-option-dark"));

    expect(onBasemapChange).toHaveBeenCalledWith("satellite");
    expect(onThemePreferenceChange).toHaveBeenCalledWith("dark");
  });

  it("shows contextual guidance for the active basemap", () => {
    const { rerender } = render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    expect(screen.getByTestId("settings-basemap-hint")).toHaveTextContent(
      "Best for place names, streets, and everyday orientation.",
    );

    rerender(
      <SettingsMenu
        basemap="satellite"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLocationSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("settings-basemap-hint")).toHaveTextContent(
      "Imagery context for land use and built form checks.",
    );
  });

  it("searches and applies a location result", async () => {
    const onLocationSelect = vi.fn();
    searchMocks.fetchLocationSearchResults.mockResolvedValue([
      {
        id: "123",
        label: "Soweto, Johannesburg, Gauteng, South Africa",
        latitude: -26.267,
        longitude: 27.854,
      },
    ]);

    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onLocationSelect={onLocationSelect}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    fireEvent.change(screen.getByTestId("settings-location-search-input"), {
      target: { value: "Soweto" },
    });
    fireEvent.click(screen.getByTestId("settings-location-search-submit"));

    const resultButton = await screen.findByRole("button", {
      name: /soweto, johannesburg/i,
    });
    fireEvent.click(resultButton);

    expect(onLocationSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "123",
        latitude: -26.267,
        longitude: 27.854,
      }),
    );
  });
});
