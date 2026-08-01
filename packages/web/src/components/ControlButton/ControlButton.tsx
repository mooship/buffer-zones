import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import styles from "./ControlButton.module.css";

export type ControlButtonShape = "icon" | "pill";
export type ControlButtonVariant = "surface" | "embedded";

export interface ControlButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  label?: string;
  shape?: ControlButtonShape;
  variant?: ControlButtonVariant;
}

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
