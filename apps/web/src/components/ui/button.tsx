"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center rounded-md border text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-accent bg-accent px-4 text-accent-foreground hover:bg-accent/90",
        secondary: "border-border bg-panel px-4 text-foreground hover:bg-panelAlt",
        ghost: "border-transparent bg-transparent px-3 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        danger: "border-danger bg-danger px-4 text-danger-foreground hover:bg-danger/90"
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
