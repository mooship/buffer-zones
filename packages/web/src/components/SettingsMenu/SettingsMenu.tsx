import { Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BASEMAPS, type Basemap } from "../../constants/basemaps";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { BasemapToggle } from "../BasemapToggle/BasemapToggle";
import { IconButton } from "../IconButton/IconButton";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./SettingsMenu.module.css";

interface SettingsMenuProps {
  basemap: Basemap;
  onBasemapChange: (basemap: Basemap) => void;
  themePreference: ThemePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
}

export function SettingsMenu({
  basemap,
  onBasemapChange,
  themePreference,
  onThemePreferenceChange,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={styles.container}
      ref={containerRef}
      data-testid="settings-menu-root"
      data-e2e="settings-menu-root"
    >
      <IconButton
        ref={triggerRef}
        className={styles.trigger}
        data-testid="settings-menu-trigger"
        data-e2e="settings-menu-trigger"
        aria-expanded={open}
        aria-controls="map-settings-menu"
        label={open ? "Close map settings" : "Map settings"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Settings aria-hidden="true" />}
      </IconButton>
      {open ? (
        <div
          id="map-settings-menu"
          className={styles.menu}
          role="menu"
          data-testid="settings-menu-content"
          data-e2e="settings-menu-content"
        >
          <BasemapToggle basemap={basemap} onChange={onBasemapChange} />
          <p
            className={styles.basemapHint}
            data-testid="settings-basemap-hint"
            aria-live="polite"
          >
            {BASEMAPS[basemap].description}
          </p>
          <ThemeToggle
            preference={themePreference}
            onChange={onThemePreferenceChange}
          />
        </div>
      ) : null}
    </div>
  );
}
