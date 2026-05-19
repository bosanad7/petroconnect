"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatCounter } from "./stat-counter";

interface Stats {
  members: number;
  companies: number;
  active_listings: number;
  messages_30d: number;
  trade_volume_kwd: number;
}

const FALLBACK: Stats = {
  members: 312,
  companies: 9,
  active_listings: 184,
  messages_30d: 1240,
  trade_volume_kwd: 28400,
};

export function StatsStrip({
  variant = "default",
}: {
  variant?: "default" | "minimal";
}) {
  const [stats, setStats] = useState<Stats>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/stats");
        if (!res.ok) return;
        const data = (await res.json()) as Stats;
        if (!cancelled) setStats(data);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={
        variant === "minimal"
          ? "grid grid-cols-2 sm:grid-cols-4 gap-8"
          : "grid grid-cols-2 sm:grid-cols-4 gap-6 p-8 rounded-3xl glass-strong inner-glow"
      }
    >
      <StatCounter value={stats.members} label="Verified members" delay={0} />
      <StatCounter value={stats.companies} label="K-Companies on board" delay={0.1} />
      <StatCounter
        value={stats.active_listings}
        label="Active listings"
        delay={0.2}
      />
      <StatCounter
        value={stats.trade_volume_kwd}
        label="KWD traded · 90 d"
        format="currency"
        prefix="KWD "
        delay={0.3}
      />
    </motion.div>
  );
}
