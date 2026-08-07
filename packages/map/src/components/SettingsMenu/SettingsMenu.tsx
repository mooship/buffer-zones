import type { ThemePreference } from "@karta/react";
import { Settings, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Basemap, getBasemapDefinition } from "../../constants/basemaps";
import { useDismissableOverlay } from "../../hooks/useDismissableOverlay";
import { BasemapToggle } from "../BasemapToggle/BasemapToggle";
import { IconButton } from "../IconButton/IconButton";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./SettingsMenu.module.css";

interface SettingsMenuProps {
  basemap: Basemap;
  onBasemapChange: (basemap: Basemap) => void;
  themePreference: ThemePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  /** Called whenever the menu opens or closes, e.g. so a caller can hide other overlays it would cover. */
  onOpenChange?: (open: boolean) => void;
}

/** A dropdown menu combining basemap and theme preference controls. */
export function SettingsMenu({
  basemap,
  onBasemapChange,
  themePreference,
  onThemePreferenceChange,
  onOpenChange,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  const updateOpen = useCallback((value: boolean) => {
    setOpen(value);
    onOpenChangeRef.current?.(value);
  }, []);
  const close = useCallback(() => updateOpen(false), [updateOpen]);

  useDismissableOverlay({
    open,
    onClose: close,
    containerRef,
    triggerRef,
    initialFocusRef: titleRef,
  });

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
        onClick={() => updateOpen(!open)}
      >
        {open ? <X aria-hidden="true" /> : <Settings aria-hidden="true" />}
      </IconButton>
      {open ? (
        <section
          id="map-settings-menu"
          className={styles.menu}
          aria-labelledby="map-settings-menu-title"
          data-testid="settings-menu-content"
          data-e2e="settings-menu-content"
        >
          <h2
            id="map-settings-menu-title"
            className={styles.title}
            ref={titleRef}
            tabIndex={-1}
          >
            Map settings
          </h2>
          <BasemapToggle basemap={basemap} onChange={onBasemapChange} />
          <p
            className={styles.basemapHint}
            data-testid="settings-basemap-hint"
            aria-live="polite"
          >
            {getBasemapDefinition(basemap).description}
          </p>
          <ThemeToggle
            preference={themePreference}
            onChange={onThemePreferenceChange}
          />
        </section>
      ) : null}
    </div>
  );
}
