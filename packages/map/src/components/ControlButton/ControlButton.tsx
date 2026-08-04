import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import styles from "./ControlButton.module.css";

/** Visual shape of a `ControlButton`. */
export type ControlButtonShape = "icon" | "pill";
/** Visual emphasis of a `ControlButton`. */
export type ControlButtonVariant = "surface" | "embedded";

/** Props for `ControlButton`. */
export interface ControlButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /**
   * Sets `aria-label`, which overrides any visible text in `children` as the
   * button's accessible name. Pass this only for icon-only buttons; for a
   * button with visible text content, omit it and let that text stand as
   * the accessible name instead.
   */
  label?: string;
  shape?: ControlButtonShape;
  variant?: ControlButtonVariant;
}

/** The base styled button used by every map control (icon buttons, pill toggles, etc.). */
export const ControlButton = forwardRef<HTMLButtonElement, ControlButtonProps>(
  function ControlButton(
    {
      children,
      className,
      label,
      shape = "icon",
      type = "button",
      variant = "surface",
      ...props
    },
    ref,
  ) {
    const resolvedClassName = className
      ? `${styles.button} ${className}`
      : styles.button;

    return (
      <button
        ref={ref}
        type={type}
        className={resolvedClassName}
        data-shape={shape}
        data-variant={variant}
        aria-label={label}
        {...props}
      >
        {children}
      </button>
    );
  },
);
