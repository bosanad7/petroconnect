import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 ring-focus",
        "transition-[border-color,background,box-shadow] duration-200",
        "hover:border-foreground/15",
        "focus:border-primary/60 focus:shadow-[0_0_0_4px_rgba(255,106,0,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
