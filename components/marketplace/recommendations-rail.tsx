"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatKWD } from "@/lib/utils/format";

interface Pick {
  id: string;
  title: string;
  price_kwd: number | null;
  images: string[] | null;
  reason: string;
  score: number;
}

export function RecommendationsRail() {
  const [items, setItems] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/recommendations");
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setItems((data.recommendations ?? []) as Pick[]);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="space-y-3">
        <RailHeader />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl shimmer" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <RailHeader />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((p, i) => (
          <RecCard key={p.id} pick={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function RailHeader() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid place-items-center size-6 rounded-md bg-primary-soft text-primary">
        <Sparkles className="size-3" />
      </span>
      <h2 className="font-semibold">Recommended for you</h2>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        · Picked by AI from listings you'll likely care about
      </span>
    </div>
  );
}

function RecCard({ pick, index }: { pick: Pick; index: number }) {
  const cover = pick.images?.[0] ?? "/placeholder.svg";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.04, 0.2),
      }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={`/listings/${pick.id}`}
        className="group block rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-500"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={cover}
            alt={pick.title}
            fill
            sizes="(min-width: 1024px) 16vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur border border-white/95 text-[9px] text-primary font-medium">
            <Sparkles className="size-2.5" />
            For you
          </div>
        </div>
        <div className="p-3 space-y-1">
          <p className="text-[12px] font-medium line-clamp-1 text-foreground">
            {pick.title}
          </p>
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-bold text-primary tabular-nums">
              {formatKWD(pick.price_kwd)}
            </span>
          </div>
          {pick.reason && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {pick.reason}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
