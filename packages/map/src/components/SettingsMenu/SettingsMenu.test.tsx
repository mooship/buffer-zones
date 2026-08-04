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

  it("labels the menu content as a region, not a menu, since its controls are toggles", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));

    expect(
      screen.getByRole("region", { name: "Map settings" }),
    ).toHaveAttribute("data-testid", "settings-menu-content");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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

  it("moves focus to the panel heading when it opens", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));

    expect(screen.getByText("Map settings")).toHaveFocus();
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

  it("reports open state via onOpenChange on trigger click, outside click, and Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    const trigger = screen.getByTestId("settings-menu-trigger");
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.mouseDown(document.body);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("does not close when clicking inside the menu", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));
    const content = screen.getByTestId("settings-menu-content");

    fireEvent.mouseDown(content);

    expect(screen.getByTestId("settings-menu-content")).toBeInTheDocument();
  });

  it("ignores non-Escape keys while open", () => {
    render(
      <SettingsMenu
        basemap="street"
        onBasemapChange={vi.fn()}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("settings-menu-trigger"));

    fireEvent.keyDown(document, { key: "a" });

    expect(screen.getByTestId("settings-menu-content")).toBeInTheDocument();
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
      />,
    );

    expect(screen.getByTestId("settings-basemap-hint")).toHaveTextContent(
      "Imagery context for land use and built form checks.",
    );
  });
});
