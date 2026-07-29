import { Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Basemap } from "../../constants/basemaps";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { BasemapToggle } from "../BasemapToggle/BasemapToggle";
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
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="map-settings-menu"
        aria-label={open ? "Close map settings" : "Map settings"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Settings aria-hidden="true" />}
      </button>
      {open ? (
        <div id="map-settings-menu" className={styles.menu} role="menu">
          <BasemapToggle basemap={basemap} onChange={onBasemapChange} />
          <ThemeToggle
            preference={themePreference}
            onChange={onThemePreferenceChange}
          />
        </div>
      ) : null}
    </div>
  );
}
