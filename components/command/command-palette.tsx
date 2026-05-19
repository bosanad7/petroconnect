"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Command,
  LayoutGrid,
  MessageSquare,
  PlusCircle,
  Search,
  Settings,
  Shield,
  Sparkles,
  Wrench,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatKWD } from "@/lib/utils/format";

interface SearchHit {
  id: string;
  title: string;
  price_kwd: number | null;
  images: string[];
  kind: "product" | "service" | "service_request";
}

interface MemberHit {
  id: string;
  full_name: string | null;
  company: string | null;
  avatar_url: string | null;
}

const NAV_ACTIONS = [
  { id: "nav:marketplace", label: "Go to Marketplace",  shortcut: "G M", icon: LayoutGrid,    href: "/marketplace" },
  { id: "nav:services",    label: "Go to Services",     shortcut: "G S", icon: Wrench,        href: "/services" },
  { id: "nav:chat",        label: "Go to Messages",     shortcut: "G C", icon: MessageSquare, href: "/chat" },
  { id: "nav:saved",       label: "Go to Saved items",  shortcut: "G F", icon: Bookmark,      href: "/saved" },
  { id: "nav:create",      label: "Create new listing", shortcut: "N",   icon: PlusCircle,    href: "/create" },
  { id: "nav:trust",       label: "Trust & verification", shortcut: "",  icon: Shield,        href: "/trust" },
] as const;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [listings, setListings] = React.useState<SearchHit[]>([]);
  const [members, setMembers] = React.useState<MemberHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Global ⌘K / Ctrl+K trigger
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Reset when opening
  React.useEffect(() => {
    if (open) {
      setQ("");
      setListings([]);
      setMembers([]);
      setActiveIdx(0);
      // Focus is auto-handled by autoFocus on input, but be defensive
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search across listings + members
  React.useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setListings([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;

    setLoading(true);
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      try {
        // Listings via the hybrid AI search endpoint
        const [listingsRes, membersRes] = await Promise.all([
          fetch("/api/ai/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: term, limit: 6 }),
            signal: ctrl.signal,
          }).catch(() => null),
          supabase
            .from("profiles")
            .select("id, full_name, company, avatar_url")
            .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
            .limit(4),
        ]);

        if (listingsRes?.ok) {
          const data = await listingsRes.json();
          setListings((data.results ?? []) as SearchHit[]);
        } else {
          setListings([]);
        }
        setMembers((membersRes.data ?? []) as MemberHit[]);
        setActiveIdx(0);
      } catch {
        /* swallow */
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [q, open, supabase]);

  // Flat ordered list of all selectable rows (for keyboard nav)
  const rows = React.useMemo(() => {
    type Row =
      | { kind: "nav"; href: string; label: string; icon: React.ComponentType<{ className?: string }>; shortcut?: string }
      | { kind: "listing"; href: string; hit: SearchHit }
      | { kind: "member"; href: string; hit: MemberHit };

    const out: Row[] = [];
    const hasQuery = q.trim().length >= 2;

    if (!hasQuery) {
      for (const a of NAV_ACTIONS) {
        out.push({ kind: "nav", href: a.href, label: a.label, icon: a.icon, shortcut: a.shortcut });
      }
    } else {
      for (const h of listings) out.push({ kind: "listing", href: `/listings/${h.id}`, hit: h });
      for (const m of members) out.push({ kind: "member", href: `/profile/${m.id}`, hit: m });
      // Show the nav actions filtered by query as a fallback
      const lower = q.toLowerCase();
      for (const a of NAV_ACTIONS) {
        if (a.label.toLowerCase().includes(lower)) {
          out.push({ kind: "nav", href: a.href, label: a.label, icon: a.icon, shortcut: a.shortcut });
        }
      }
    }
    return out;
  }, [q, listings, members]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const row = rows[activeIdx];
        if (row) {
          e.preventDefault();
          setOpen(false);
          router.push(row.href);
        }
      }
    },
    [rows, activeIdx, router],
  );

  // Scroll active row into view
  React.useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-row="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <>
      {/* Floating trigger chip — visible in topbar, but can be omitted if you prefer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] grid place-items-start justify-items-center pt-[14vh] bg-black/40 backdrop-blur-sm px-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Input bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search listings, members, or jump to…"
                  className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
                  autoFocus
                />
                {loading && (
                  <span className="size-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted border border-border text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
                {q.trim().length < 2 ? (
                  <Section label="Quick actions">
                    {NAV_ACTIONS.map((a, i) => (
                      <NavRow
                        key={a.id}
                        index={i}
                        active={activeIdx === i}
                        onHover={() => setActiveIdx(i)}
                        href={a.href}
                        label={a.label}
                        icon={a.icon}
                        shortcut={a.shortcut}
                        onPick={() => setOpen(false)}
                      />
                    ))}
                  </Section>
                ) : rows.length === 0 && !loading ? (
                  <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No matches for &ldquo;{q}&rdquo;.
                  </div>
                ) : (
                  <>
                    {listings.length > 0 && (
                      <Section label="Listings" icon={<Sparkles className="size-3" />}>
                        {listings.map((hit, i) => {
                          const rowIdx = i;
                          return (
                            <ListingRow
                              key={hit.id}
                              hit={hit}
                              index={rowIdx}
                              active={activeIdx === rowIdx}
                              onHover={() => setActiveIdx(rowIdx)}
                              onPick={() => setOpen(false)}
                            />
                          );
                        })}
                      </Section>
                    )}

                    {members.length > 0 && (
                      <Section label="Members">
                        {members.map((m, i) => {
                          const rowIdx = listings.length + i;
                          return (
                            <MemberRow
                              key={m.id}
                              member={m}
                              index={rowIdx}
                              active={activeIdx === rowIdx}
                              onHover={() => setActiveIdx(rowIdx)}
                              onPick={() => setOpen(false)}
                            />
                          );
                        })}
                      </Section>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Hint>↑↓</Hint> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <Hint>↵</Hint> select
                  </span>
                  <span className="flex items-center gap-1">
                    <Hint>esc</Hint> close
                  </span>
                </div>
                <span className="flex items-center gap-1.5">
                  <Command className="size-3" /> PetroConnect
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------- */
/* Subcomponents                                                         */
/* -------------------------------------------------------------------- */

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="px-4 pt-2 pb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Row({
  active,
  onHover,
  onPick,
  href,
  children,
  index,
}: {
  active: boolean;
  onHover: () => void;
  onPick: () => void;
  href: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <Link
      href={href}
      onClick={onPick}
      onMouseEnter={onHover}
      data-row={index}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      {children}
    </Link>
  );
}

function NavRow({
  active,
  onHover,
  onPick,
  href,
  label,
  icon: Icon,
  shortcut,
  index,
}: {
  active: boolean;
  onHover: () => void;
  onPick: () => void;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  index: number;
}) {
  return (
    <Row active={active} onHover={onHover} onPick={onPick} href={href} index={index}>
      <span
        className={cn(
          "size-7 grid place-items-center rounded-md border",
          active
            ? "bg-primary/15 text-primary border-primary/30"
            : "bg-muted text-muted-foreground border-border",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="text-sm flex-1 truncate">{label}</span>
      {shortcut && (
        <span className="flex items-center gap-1">
          {shortcut.split(" ").map((k) => (
            <Hint key={k}>{k}</Hint>
          ))}
        </span>
      )}
      <ArrowRight
        className={cn(
          "size-3.5 shrink-0 transition-opacity",
          active ? "opacity-100 text-primary" : "opacity-0",
        )}
      />
    </Row>
  );
}

function ListingRow({
  hit,
  active,
  onHover,
  onPick,
  index,
}: {
  hit: SearchHit;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
  index: number;
}) {
  return (
    <Row
      active={active}
      onHover={onHover}
      onPick={onPick}
      href={`/listings/${hit.id}`}
      index={index}
    >
      {hit.images?.[0] ? (
        <div className="relative size-9 rounded-md overflow-hidden shrink-0 bg-muted">
          <Image src={hit.images[0]} alt="" fill sizes="36px" className="object-cover" />
        </div>
      ) : (
        <div className="size-9 rounded-md bg-muted grid place-items-center shrink-0">
          <Sparkles className="size-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{hit.title}</p>
        <p className="text-[11px] text-muted-foreground capitalize">
          {hit.kind.replace("_", " ")}
        </p>
      </div>
      <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
        {formatKWD(hit.price_kwd)}
      </span>
    </Row>
  );
}

function MemberRow({
  member,
  active,
  onHover,
  onPick,
  index,
}: {
  member: MemberHit;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
  index: number;
}) {
  const initials =
    member.full_name
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") ?? "?";
  return (
    <Row
      active={active}
      onHover={onHover}
      onPick={onPick}
      href={`/profile/${member.id}`}
      index={index}
    >
      {member.avatar_url ? (
        <div className="relative size-9 rounded-full overflow-hidden shrink-0">
          <Image src={member.avatar_url} alt="" fill sizes="36px" className="object-cover" />
        </div>
      ) : (
        <div className="size-9 rounded-full bg-muted grid place-items-center text-xs font-medium shrink-0">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate flex items-center gap-1">
          {member.full_name ?? "Member"}
          <UserIcon className="size-3 text-muted-foreground" />
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {member.company ?? "K-Company"}
        </p>
      </div>
    </Row>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-card border border-border text-[10px] text-muted-foreground tabular-nums shadow-xs">
      {children}
    </kbd>
  );
}

// Suppress unused import warning if Settings isn't currently referenced
void Settings;
