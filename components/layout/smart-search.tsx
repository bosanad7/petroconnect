"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatKWD } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface SearchHit {
  id: string;
  title: string;
  description: string;
  price_kwd: number | null;
  images: string[];
  kind: "product" | "service" | "service_request";
  similarity: number | null;
}

export function SmartSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [usedSemantic, setUsedSemantic] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced search
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: term, limit: 8 }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setResults((data.results ?? []) as SearchHit[]);
        setUsedSemantic(Boolean(data.used_semantic));
        setActiveIdx(0);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [q]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/marketplace?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const hit = results[activeIdx];
      if (hit) {
        e.preventDefault();
        setOpen(false);
        router.push(`/listings/${hit.id}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-xl">
      <form onSubmit={submit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products, services, sellers…"
          className="pl-9 pr-20 h-10"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
        )}
        <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted border border-border text-[10px] font-medium text-muted-foreground tabular-nums">
          ⌘K
        </kbd>
      </form>

      <AnimatePresence>
        {open && q.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-40 left-0 right-0 mt-2 rounded-2xl bg-card border border-border shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                {usedSemantic ? (
                  <>
                    <Sparkles className="size-3 text-primary" />
                    <span>AI-ranked matches</span>
                  </>
                ) : (
                  <>
                    <Search className="size-3" />
                    <span>Keyword matches</span>
                  </>
                )}
              </div>
              <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
            </div>

            {results.length === 0 && !loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No matches. Press <kbd className="px-1 rounded bg-muted border border-border text-[10px]">Enter</kbd> to view all marketplace listings.
              </div>
            ) : (
              <ul className="max-h-[440px] overflow-y-auto">
                {results.map((hit, i) => (
                  <li key={hit.id}>
                    <Link
                      href={`/listings/${hit.id}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition",
                        i === activeIdx ? "bg-muted" : "hover:bg-muted/60",
                      )}
                    >
                      {hit.images?.[0] ? (
                        <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <Image
                            src={hit.images[0]}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-12 rounded-lg bg-muted grid place-items-center shrink-0">
                          <Search className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium truncate">{hit.title}</p>
                          {hit.kind !== "product" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 uppercase tracking-wide border border-border">
                              {hit.kind === "service" ? "Service" : "Request"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {hit.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-primary tabular-nums">
                          {formatKWD(hit.price_kwd)}
                        </p>
                        {hit.similarity != null && (
                          <p className="text-[9px] text-muted-foreground tabular-nums">
                            {(hit.similarity * 100).toFixed(0)}% match
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer — view all */}
            {results.length > 0 && (
              <Link
                href={`/marketplace?q=${encodeURIComponent(q.trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-primary hover:bg-muted/60 transition"
              >
                <span>See all results for "{q.trim()}"</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
