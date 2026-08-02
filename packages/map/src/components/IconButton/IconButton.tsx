import { forwardRef, type ReactNode } from "react";
import {
  ControlButton,
  type ControlButtonProps,
  type ControlButtonVariant,
} from "../ControlButton/ControlButton";

interface IconButtonProps
  extends Omit<ControlButtonProps, "label" | "shape" | "children"> {
  children: ReactNode;
  label: string;
  variant?: ControlButtonVariant;
}

/** A `ControlButton` preset for icon-only, accessibly-labelled actions. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, label, variant = "surface", ...props }, ref) {
    return (
      <ControlButton
        ref={ref}
        label={label}
        shape="icon"
        variant={variant}
        {...props}
      >
        {children}
      </ControlButton>
    );
  },
);
