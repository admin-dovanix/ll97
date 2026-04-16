"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-sidebar bg-sidebar px-4 text-white hover:bg-sidebar/94",
        secondary: "border-border bg-panel px-4 text-foreground hover:bg-panelAlt",
        ghost: "border-transparent bg-transparent px-3 text-foreground/68 hover:bg-panelAlt hover:text-foreground",
        danger: "border-danger/25 bg-danger/8 px-4 text-danger hover:bg-danger/12"
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} type={type} {...props} />;
  }
);

Button.displayName = "Button";

export { buttonVariants };
