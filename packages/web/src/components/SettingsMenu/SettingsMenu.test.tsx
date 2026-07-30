import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsMenu } from "./SettingsMenu";

describe("SettingsMenu", () => {
  it("is closed by default and toggles open state from the trigger", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
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
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    fireEvent.click(screen.getByTestId("basemap-option-analysis"));
    fireEvent.click(screen.getByTestId("theme-option-dark"));

    expect(onBasemapChange).toHaveBeenCalledWith("analysis");
    expect(onThemePreferenceChange).toHaveBeenCalledWith("dark");
  });

  it("shows contextual guidance for the active basemap", () => {
    const { rerender } = render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    expect(screen.getByTestId("settings-basemap-hint")).toHaveTextContent(
      "Best for place names, streets, and everyday orientation.",
    );

    rerender(
      <SettingsMenu
        basemap="analysis"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("settings-basemap-hint")).toHaveTextContent(
      "Low-clutter base to compare layer colours and patterns.",
    );
  });
});
