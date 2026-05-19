"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile } from "@/types/database";

const STORAGE_KEY_PREFIX = "pc.onboarded.v1.";

const STEPS = [
  {
    icon: ShieldCheck,
    accent: "from-emerald-500/30 to-emerald-500/5 text-emerald-300 border-emerald-500/30",
    title: "You're inside the verified network",
    body: "Every member you'll see is a current K-Company employee. No public sign-ups, no anonymous accounts.",
  },
  {
    icon: PlusCircle,
    accent: "from-primary/30 to-primary/5 text-primary border-primary/30",
    title: "Post your first listing",
    body: "Drop a photo and a sentence — our AI drafts the title, description, category, and a fair-price suggestion in seconds.",
  },
  {
    icon: Bot,
    accent: "from-blue-500/30 to-blue-500/5 text-blue-300 border-blue-500/30",
    title: "Use AI guardrails",
    body: "Every new listing is automatically checked for fraud risk and near-duplicates before it goes live.",
  },
  {
    icon: MessageSquare,
    accent: "from-violet-500/30 to-violet-500/5 text-violet-300 border-violet-500/30",
    title: "Chat in-app, meet in person",
    body: "Real-time messaging keeps the conversation inside PetroConnect. No phone numbers leaked, no off-platform handoffs.",
  },
];

export function WelcomeModal({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Skip in demo — the banner already tells you you're in demo mode
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;

    const key = STORAGE_KEY_PREFIX + profile.id;
    const seen = typeof window !== "undefined" && localStorage.getItem(key);
    if (seen) return;

    // Only show for relatively fresh accounts (≤ 7 days old). Older
    // members re-logging in shouldn't get the welcome tour.
    const ageDays =
      (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000;
    if (ageDays > 7) return;

    // Slight delay so it doesn't feel like an interruption
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [profile.id, profile.created_at]);

  function dismiss(persist = true) {
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + profile.id, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  const isLast = step === STEPS.length - 1;
  const Step = STEPS[step];
  const Icon = Step.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {/* Visually-hidden a11y label so screen readers know the title */}
        <DialogHeader className="sr-only">
          <DialogTitle>Welcome to PetroConnect</DialogTitle>
          <DialogDescription>{Step.title}</DialogDescription>
        </DialogHeader>

        <div className="relative px-7 py-9">
          <div className="absolute inset-0 mesh-backdrop opacity-60 pointer-events-none" />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-primary">
              <Sparkles className="size-3" />
              Welcome, {profile.full_name?.split(" ")[0] ?? "colleague"}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div
                  className={`size-14 rounded-2xl grid place-items-center bg-gradient-to-br border ${Step.accent}`}
                >
                  <Icon className="size-6" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {Step.title}
                </h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  {Step.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 pt-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={
                    i === step
                      ? "h-1.5 w-6 rounded-full bg-primary transition-all"
                      : "h-1.5 w-1.5 rounded-full bg-white/15 hover:bg-white/30 transition-all"
                  }
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 gap-2">
              <Button variant="ghost" onClick={() => dismiss()}>
                Skip tour
              </Button>
              {isLast ? (
                <Button asChild onClick={() => dismiss()}>
                  <Link href="/create">
                    Post your first listing
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}>
                  Next <ArrowRight className="size-4" />
                </Button>
              )}
            </div>

            {profile.is_verified && (
              <p className="pt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <BadgeCheck className="size-3 text-primary" />
                Your {profile.company ?? "K-Company"} corporate email has been verified.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
