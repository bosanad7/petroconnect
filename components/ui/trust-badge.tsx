"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Crown,
  Gem,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { KCompany } from "@/types/database";

export type TrustTier = "newcomer" | "trusted" | "pro" | "elite";

interface Props {
  tier?: TrustTier | null;
  score?: number | null;
  company?: KCompany | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  size?: "xs" | "sm" | "md" | "lg";
  withLabel?: boolean;
  className?: string;
}

const TIERS: Record<
  TrustTier,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;       // background gradient
    text: string;            // text color
    ring: string;            // ring/border color
    soft: string;            // soft tint container
    description: string;
  }
> = {
  newcomer: {
    label: "Verified",
    icon: BadgeCheck,
    gradient: "from-slate-400 to-slate-500",
    text: "text-slate-700",
    ring: "ring-slate-200",
    soft: "bg-slate-50 border-slate-200",
    description: "Email confirmed against a K-Company corporate domain.",
  },
  trusted: {
    label: "Trusted",
    icon: ShieldCheck,
    gradient: "from-blue-500 to-blue-600",
    text: "text-blue-700",
    ring: "ring-blue-200",
    soft: "bg-blue-50 border-blue-100",
    description:
      "Active member with a positive track record across multiple trades.",
  },
  pro: {
    label: "Pro Seller",
    icon: Gem,
    gradient: "from-orange-500 to-amber-500",
    text: "text-orange-700",
    ring: "ring-orange-200",
    soft: "bg-orange-50 border-orange-100",
    description:
      "Top-rated seller with many successful trades and fast response times.",
  },
  elite: {
    label: "Elite",
    icon: Crown,
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    text: "text-amber-700",
    ring: "ring-amber-200",
    soft: "bg-amber-50 border-amber-100",
    description:
      "Top 5% of all members. Verified employee, top reputation, and a deep trade history.",
  },
};

const SIZES = {
  xs: { icon: "size-3",   label: "text-[10px]", pad: "px-1.5 py-0.5" },
  sm: { icon: "size-3.5", label: "text-[11px]", pad: "px-2 py-0.5" },
  md: { icon: "size-4",   label: "text-xs",    pad: "px-2.5 py-1" },
  lg: { icon: "size-5",   label: "text-sm",    pad: "px-3 py-1.5" },
} as const;

export function TrustBadge({
  tier = "newcomer",
  score,
  company,
  ratingAvg,
  ratingCount,
  size = "sm",
  withLabel = false,
  className,
}: Props) {
  const t = TIERS[tier ?? "newcomer"];
  const s = SIZES[size];
  const Icon = t.icon;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${t.label} K-Company employee`}
          className={cn(
            "group inline-flex items-center align-middle ring-focus rounded-full",
            withLabel
              ? cn(
                  "gap-1 rounded-full border",
                  t.soft,
                  s.pad,
                )
              : "gap-0",
            className,
          )}
        >
          {/* Icon with gradient — elite gets a faint glow */}
          <span
            className={cn(
              "relative inline-grid place-items-center rounded-full",
              size === "xs" || size === "sm"
                ? "size-4"
                : size === "md"
                ? "size-5"
                : "size-6",
              "bg-gradient-to-br shadow-xs",
              t.gradient,
            )}
          >
            {tier === "elite" && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-amber-300/50 blur-md"
                animate={{ opacity: [0.45, 0.85, 0.45] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <Icon className={cn(s.icon, "relative text-white")} />
          </span>

          {withLabel && (
            <span className={cn("font-semibold uppercase tracking-wider", t.text, s.label)}>
              {t.label}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={6}
          className={cn(
            "z-50 w-72 rounded-xl bg-card border border-border shadow-lg p-4 text-xs space-y-3",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "relative size-9 grid place-items-center rounded-xl bg-gradient-to-br shadow-sm",
                t.gradient,
              )}
            >
              <Icon className="size-4 text-white relative" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                {t.label} member
                {typeof score === "number" && (
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                    · score {score}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {company ? `Verified at ${company}` : "Verified K-Company employee"}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">{t.description}</p>

          {/* Mini stat strip */}
          {(ratingCount ?? 0) > 0 && (
            <div className="flex items-center gap-3 pt-2 border-t border-border text-[11px]">
              <span className="inline-flex items-center gap-1 text-foreground/90">
                <Sparkles className="size-3 text-amber-500" />
                {(ratingAvg ?? 0).toFixed(1)} avg
              </span>
              <span className="text-muted-foreground">
                {ratingCount} review{ratingCount === 1 ? "" : "s"}
              </span>
            </div>
          )}

          <a
            href="/trust"
            className="block text-[11px] text-primary hover:underline pt-1"
          >
            How trust tiers work →
          </a>

          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
