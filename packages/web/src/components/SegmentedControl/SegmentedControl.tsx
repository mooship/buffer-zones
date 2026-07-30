import styles from "./SegmentedControl.module.css";

export interface SegmentedControlOption<OptionId extends string> {
  ariaLabel?: string;
  disabled?: boolean;
  id: OptionId;
  label: string;
}

interface SegmentedControlProps<OptionId extends string> {
  label: string;
  onChange: (value: OptionId) => void;
  options: SegmentedControlOption<OptionId>[];
  testId: string;
  value: OptionId;
}

export function SegmentedControl<OptionId extends string>({
  label,
  onChange,
  options,
  testId,
  value,
}: SegmentedControlProps<OptionId>) {
  return (
    <fieldset className={styles.group} data-testid={testId} data-e2e={testId}>
      <legend className={styles.legend}>{label}</legend>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={styles.option}
          data-testid={`${testId}-option-${option.id}`}
          data-e2e={`${testId}-option-${option.id}`}
          aria-pressed={option.id === value}
          aria-label={option.ariaLabel ?? option.label}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
