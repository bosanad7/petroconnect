"use client";

import * as React from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";

const tints = {
  default:
    "from-primary/25 to-primary/5 text-primary border-primary/30 shadow-[0_10px_30px_-10px_rgba(56,112,255,0.45)]",
  warning:
    "from-amber-500/25 to-amber-500/5 text-amber-400 border-amber-500/30 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.45)]",
  danger:
    "from-red-500/25 to-red-500/5 text-red-400 border-red-500/30 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.45)]",
} as const;

export function StatCard({
  icon,
  label,
  value,
  tone = "default",
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: keyof typeof tints;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ y: -3 }}
      className="relative rounded-2xl glass inner-glow overflow-hidden p-5 flex items-center gap-4 group"
    >
      <div
        className={`relative size-12 grid place-items-center rounded-xl bg-gradient-to-br border ${tints[tone]}`}
      >
        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-muted/60 transition" />
        <span className="relative">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold font-display tabular-nums">
          <Counter to={value} active={inView} />
        </p>
      </div>
    </motion.div>
  );
}

function Counter({ to, active }: { to: number; active: boolean }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());

  React.useEffect(() => {
    if (!active) return;
    const controls = animate(mv, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [active, to, mv]);

  return <motion.span>{rounded}</motion.span>;
}
