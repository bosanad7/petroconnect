"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-xl text-sm font-medium tracking-[-0.005em]",
    "ring-focus disabled:pointer-events-none disabled:opacity-50",
    "transition-[transform,background,color,box-shadow,border-color] duration-300 ease-out",
    "active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "text-white",
          "bg-[linear-gradient(180deg,#FF8533_0%,#FF6A00_100%)]",
          "shadow-orange",
          "hover:brightness-105 hover:shadow-[0_16px_36px_-8px_rgba(255,106,0,0.45)]",
        ].join(" "),
        secondary:
          "bg-secondary text-foreground hover:bg-secondary/70 border border-border",
        outline:
          "border border-border bg-card hover:bg-muted/60 text-foreground shadow-xs",
        ghost: "hover:bg-muted text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
        soft:
          "bg-primary-soft text-orange-700 hover:bg-orange-100 border border-orange-100",
        // Alias kept so existing call-sites don't break — light soft tile
        glass:
          "bg-primary-soft text-orange-700 hover:bg-orange-100 border border-orange-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3.5",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
