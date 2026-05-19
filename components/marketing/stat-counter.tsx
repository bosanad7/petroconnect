"use client";

import * as React from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";

interface Props {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  format?: "default" | "currency" | "k";
  delay?: number;
}

function fmt(v: number, format: Props["format"]) {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-KW").format(Math.round(v));
    case "k":
      return v >= 1000
        ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k`
        : Math.round(v).toString();
    default:
      return Math.round(v).toLocaleString();
  }
}

export function StatCounter({
  value,
  label,
  suffix,
  prefix,
  format = "default",
  delay = 0,
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => `${prefix ?? ""}${fmt(v, format)}${suffix ?? ""}`);

  React.useEffect(() => {
    if (!inView) return;
    const ctrl = animate(mv, value, {
      duration: 1.4,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return ctrl.stop;
  }, [inView, value, mv, delay]);

  return (
    <div ref={ref} className="space-y-1">
      <motion.div className="text-3xl sm:text-4xl font-display font-semibold tracking-tight tabular-nums text-foreground">
        {display}
      </motion.div>
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
