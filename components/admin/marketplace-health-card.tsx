"use client";

import { motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface Factor {
  label: string;
  value: number;        // 0..1
  weight: number;       // sums to ~100 across factors
}

interface Props {
  score: number;        // 0..100
  delta?: number;       // signed, just for arrow direction
  factors: Factor[];
  insight: string;
  className?: string;
}

const SIZE = 160;
const STROKE = 12;

export function MarketplaceHealthCard({
  score,
  delta = 0,
  factors,
  insight,
  className,
}: Props) {
  const tone =
    score >= 80
      ? { text: "text-emerald-600", track: "stroke-emerald-100", arc: "stroke-emerald-500" }
      : score >= 60
      ? { text: "text-blue-600", track: "stroke-blue-100", arc: "stroke-blue-500" }
      : score >= 40
      ? { text: "text-amber-600", track: "stroke-amber-100", arc: "stroke-amber-500" }
      : { text: "text-rose-600", track: "stroke-rose-100", arc: "stroke-rose-500" };

  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (score / 100);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 sm:p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-start">
        {/* Gauge */}
        <div className="relative shrink-0">
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              strokeWidth={STROKE}
              fill="none"
              className={cn(tone.track)}
            />
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              className={cn(tone.arc)}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: `${dash} ${circumference - dash}`,
              }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className={cn("text-4xl font-display font-semibold tabular-nums", tone.text)}>
                {score}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Health · / 100
              </p>
            </div>
          </div>
        </div>

        {/* Insight + factors */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-start gap-2">
            <span className="size-7 grid place-items-center rounded-lg bg-primary-soft text-primary border border-orange-100 shrink-0">
              <Sparkles className="size-3.5" />
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {insight}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="size-3.5" />
            <span>Components</span>
            {delta !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 ml-2",
                  delta > 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {Math.abs(delta)}
              </span>
            )}
          </div>

          <ul className="space-y-2">
            {factors.map((f) => (
              <li key={f.label}>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{f.label}</span>
                  <span className="tabular-nums">
                    {Math.round(f.value * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${f.value * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
