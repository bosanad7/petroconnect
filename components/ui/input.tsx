import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground/70 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "ring-focus disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[border-color,background,box-shadow] duration-200",
          "hover:border-foreground/15",
          "focus:border-primary/60 focus:shadow-[0_0_0_4px_rgba(255,106,0,0.12)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
