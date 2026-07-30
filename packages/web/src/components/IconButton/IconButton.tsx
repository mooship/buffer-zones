import { type ReactNode, forwardRef } from "react";
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
