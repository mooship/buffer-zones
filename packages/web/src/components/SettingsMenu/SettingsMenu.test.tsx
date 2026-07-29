import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsMenu } from "./SettingsMenu";

function renderMenu() {
  const onBasemapChange = vi.fn();
  const onThemePreferenceChange = vi.fn();
  const onMetroChange = vi.fn();
  render(
    <SettingsMenu
      basemap="street"
      onBasemapChange={onBasemapChange}
      themePreference="system"
      onThemePreferenceChange={onThemePreferenceChange}
      metroId="tshwane"
      onMetroChange={onMetroChange}
    />,
  );
  return { onBasemapChange, onThemePreferenceChange, onMetroChange };
}

describe("SettingsMenu", () => {
  it("is closed by default", () => {
    renderMenu();

    expect(
      screen.queryByRole("button", { name: /satellite basemap/i }),
    ).not.toBeInTheDocument();
  });

  it("opens to reveal the basemap and theme toggles", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /map settings/i }));

    expect(
      screen.getByRole("button", { name: /satellite basemap/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dark theme/i }),
    ).toBeInTheDocument();
  });

  it("forwards basemap and theme changes", () => {
    const { onBasemapChange, onThemePreferenceChange, onMetroChange } =
      renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /map settings/i }));
    fireEvent.click(screen.getByRole("button", { name: /satellite basemap/i }));
    fireEvent.click(screen.getByRole("button", { name: /dark theme/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /johannesburg metro/i }),
    );

    expect(onBasemapChange).toHaveBeenCalledWith("satellite");
    expect(onThemePreferenceChange).toHaveBeenCalledWith("dark");
    expect(onMetroChange).toHaveBeenCalledWith("johannesburg");
  });

  it("closes when clicking the trigger again", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: /map settings/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /close map settings/i }),
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the menu", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /map settings/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("stays open when clicking inside the menu", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /map settings/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("menu"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("stays open when a non-Escape key is pressed", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /map settings/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Enter" });

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes and returns focus to the trigger when Escape is pressed", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: /map settings/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /map settings/i })).toHaveFocus();
  });
});
