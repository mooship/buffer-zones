import type { ThemePreference } from "../../hooks/useThemePreference";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";

interface ThemeToggleProps {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
}

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** A `SegmentedControl` for choosing between system/light/dark theme preference. */
export function ThemeToggle({ preference, onChange }: ThemeToggleProps) {
  return (
    <SegmentedControl
      label="Theme"
      options={THEME_OPTIONS.map((option) => ({
        ...option,
        ariaLabel: `${option.label} theme`,
      }))}
      value={preference}
      onChange={onChange}
      testId="theme"
    />
  );
}
