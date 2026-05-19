"use client";

import * as React from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import {
  TrendingUp,
  Wallet,
  Receipt,
  Coins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKWD } from "@/lib/utils/format";

interface Props {
  totals: {
    transactions_total: number;
    transaction_value_kwd: number;
    average_transaction_value_kwd: number;
    platform_fee_revenue_kwd: number;
  };
}

export function RevenueStatsCards({ totals }: Props) {
  const items = [
    {
      label: "Transaction volume",
      value: totals.transaction_value_kwd,
      icon: TrendingUp,
      tone: "from-emerald-500 to-emerald-600",
      fmt: formatKWD,
    },
    {
      label: "Platform fee revenue",
      value: totals.platform_fee_revenue_kwd,
      icon: Coins,
      tone: "from-orange-500 to-amber-500",
      fmt: formatKWD,
    },
    {
      label: "Avg transaction",
      value: totals.average_transaction_value_kwd,
      icon: Wallet,
      tone: "from-blue-500 to-blue-600",
      fmt: formatKWD,
    },
    {
      label: "Trades completed",
      value: totals.transactions_total,
      icon: Receipt,
      tone: "from-violet-500 to-violet-600",
      fmt: (n: number) => Math.round(n).toLocaleString(),
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((s, i) => (
        <RevenueStat key={s.label} {...s} delay={i * 0.06} />
      ))}
    </div>
  );
}

function RevenueStat({
  label,
  value,
  icon: Icon,
  tone,
  fmt,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  fmt: (n: number) => string;
  delay: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => fmt(v));

  React.useEffect(() => {
    if (!inView) return;
    const ctrl = animate(mv, value, {
      duration: 1.2,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return ctrl.stop;
  }, [inView, value, mv, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div
            className={`size-12 grid place-items-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-sm shrink-0`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <motion.p className="text-2xl font-display font-semibold tabular-nums truncate">
              {display}
            </motion.p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
