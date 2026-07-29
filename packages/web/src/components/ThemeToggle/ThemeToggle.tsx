import type { ThemePreference } from "../../hooks/useThemePreference";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
}

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function ThemeToggle({ preference, onChange }: ThemeToggleProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Theme</legend>
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={styles.option}
          aria-pressed={option.id === preference}
          aria-label={`${option.label} theme`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
