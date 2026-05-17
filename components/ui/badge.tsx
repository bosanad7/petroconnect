import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/20",
        secondary: "bg-white/[0.06] text-foreground border border-white/10",
        success:
          "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        warning:
          "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        danger:
          "bg-red-500/15 text-red-400 border border-red-500/30",
        outline: "border border-white/10 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
