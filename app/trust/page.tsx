"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Building2,
  Eye,
  Flag,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { K_COMPANIES } from "@/lib/constants";

const ease = [0.16, 1, 0.3, 1] as const;

export default function TrustPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container py-5 flex items-center justify-between">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="size-4" /> Back home
          </Link>
        </Button>
      </header>

      <main className="container max-w-3xl py-16 space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-primary">
            <ShieldCheck className="size-3" /> Trust & safety
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
            How we keep PetroConnect{" "}
            <span className="gradient-text-blue">a closed network of colleagues.</span>
          </h1>
          <p className="text-muted-foreground text-pretty text-lg">
            We don't moderate spam after the fact — we lock the front door so
            it never gets in. Every member is a current K-Company employee. No
            exceptions, no public sign-ups, no anonymous accounts.
          </p>
        </motion.div>

        {/* Pillars */}
        <Pillar
          icon={Lock}
          title="1. Corporate-email gate"
          body={
            <>
              <p>
                Registration is restricted to a fixed list of K-Company email
                domains. Both the front-end and the database refuse anything
                else — a row in <code className="px-1 rounded bg-muted text-foreground/90">profiles</code>{" "}
                only gets <code className="px-1 rounded bg-muted text-foreground/90">is_verified = true</code>{" "}
                if its email ends in one of these:
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {K_COMPANIES.map((c) => (
                  <span
                    key={c.domain}
                    className="px-2 py-1 rounded-md glass text-[11px] font-medium tabular-nums"
                  >
                    @{c.domain}
                  </span>
                ))}
              </div>
              <p className="mt-3">
                We're adding new K-Company subsidiaries continuously — if your
                domain isn't on the list yet, contact the admin to whitelist it.
              </p>
            </>
          }
        />

        <Pillar
          icon={BadgeCheck}
          title="2. Verified badge everywhere"
          body={
            <p>
              Every profile, listing card, chat header, and report shows a
              verified badge tied to the underlying employee record. You can
              click any member's profile to see which K-Company they belong to
              and how long they've been on the platform — the badge is sourced
              from <code className="px-1 rounded bg-muted text-foreground/90">profiles.is_verified</code>,{" "}
              which is set <em>only</em> by the database trigger that runs at
              signup. Browser code can't fake it.
            </p>
          }
        />

        <Pillar
          icon={Bot}
          title="3. AI guardrails on every listing"
          body={
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <span className="text-foreground/90 font-medium">Fraud score:</span> a fraud model evaluates the title,
                description, and price at publish time and stores a score
                between 0 and 1. Anything ≥ 0.6 surfaces in the admin queue.
              </li>
              <li>
                <span className="text-foreground/90 font-medium">Duplicate detection:</span> a 1536-dim embedding plus a
                normalized fingerprint catches near-duplicates before they go
                live. The seller is shown the matches and must confirm.
              </li>
              <li>
                <span className="text-foreground/90 font-medium">Price sanity check:</span> we surface a fair-price range
                derived from semantic neighbours so suspiciously-cheap or
                wildly-overpriced posts stand out.
              </li>
            </ul>
          }
        />

        <Pillar
          icon={Eye}
          title="4. Human moderation"
          body={
            <p>
              One tap on any listing files a report with a structured reason.
              Admin members see the full queue with reporter, listing, AI
              flags, and one-click actions to remove the listing or dismiss the
              report. There's always a person on the other end.
            </p>
          }
        />

        <Pillar
          icon={Flag}
          title="5. Reporting & disputes"
          body={
            <p>
              Members can report scams, prohibited items, miscategorisation,
              or impersonation. We treat every report as actionable until a
              moderator triages it. If a transaction goes wrong, both parties
              can be linked back to verified employees — there are no
              throwaway accounts.
            </p>
          }
        />

        <Pillar
          icon={Building2}
          title="6. Data + infrastructure"
          body={
            <ul className="space-y-1.5">
              <li>• Postgres on Supabase EU-Central (Frankfurt) with point-in-time recovery.</li>
              <li>• Row-Level Security on every table. Anonymous role: zero reach.</li>
              <li>• Realtime traffic is HMAC-signed and TLS-only.</li>
              <li>• Listing images live in private buckets with public-read RLS — only the owner can mutate them.</li>
              <li>• AI requests are server-only; no API keys ever reach the browser.</li>
            </ul>
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="rounded-3xl glass-strong p-8 text-center space-y-4"
        >
          <h2 className="text-2xl font-semibold">Have a security concern?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto text-pretty">
            Email an admin or file a report from any listing. We aim to triage
            within 24 hours and act within 72.
          </p>
          <Button asChild>
            <Link href="/login">Sign in to report</Link>
          </Button>
        </motion.div>
      </main>

      <footer className="container py-10 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
        <Logo showWord />
        <p>© {new Date().getFullYear()} PetroConnect</p>
      </footer>
    </div>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
      className="grid sm:grid-cols-[auto_1fr] gap-5"
    >
      <div className="size-12 rounded-2xl glass border border-primary/30 grid place-items-center text-primary shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="space-y-2 text-sm text-muted-foreground text-pretty">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {body}
      </div>
    </motion.section>
  );
}
