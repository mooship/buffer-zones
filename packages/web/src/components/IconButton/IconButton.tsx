import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { children, className, label, type = "button", ...props },
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
        aria-label={label}
        {...props}
      >
        {children}
      </button>
    );
  },
);
