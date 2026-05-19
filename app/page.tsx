"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  CircleCheckBig,
  Eye,
  Flame,
  Lock,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { K_COMPANIES } from "@/lib/constants";

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function LandingPage() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-background">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="sticky top-0 z-30 backdrop-blur-xl bg-background/85 border-b border-border"
      >
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <Link href="/trust" className="hover:text-foreground transition-colors">Trust</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={isDemo ? "/marketplace" : "/register"}>
                {isDemo ? "Enter demo" : "Get started"}
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* HERO */}
      <section className="relative container pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute inset-x-0 top-0 -z-10 h-[700px] overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-32 left-1/2 -translate-x-1/2 size-[1100px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,106,0,0.18) 0%, transparent 55%)" }}
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-40 -left-32 size-[600px] rounded-full opacity-80"
            style={{ background: "radial-gradient(circle, rgba(56,112,255,0.10) 0%, transparent 60%)" }}
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto text-center space-y-6"
        >
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-orange-100 text-xs text-orange-700">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Closed network · employees of Kuwait's K-Companies
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-[2.75rem] sm:text-6xl lg:text-7xl font-semibold tracking-tight text-balance leading-[1.04] text-foreground"
          >
            A marketplace of{" "}
            <span className="gradient-text-orange">colleagues,</span>
            <br />
            not strangers.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"
          >
            PetroConnect is a private platform where verified employees of KPC,
            KOC, KNPC, KIPIC, PIC and more buy, sell, and exchange services —
            inside one trusted professional community.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-3 pt-2 flex-wrap"
          >
            <Button asChild size="xl">
              <Link href={isDemo ? "/marketplace" : "/register"}>
                {isDemo ? "Enter demo" : "Join with your work email"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/trust">How verification works</Link>
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="text-xs text-muted-foreground pt-1">
            {isDemo
              ? "Running in demo mode — no signup needed."
              : "Registration limited to verified K-Company emails."}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <StatsStrip />
        </motion.div>
      </section>

      {/* COMPANIES */}
      <section id="trust-companies" className="container py-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center text-xs uppercase tracking-[0.22em] text-muted-foreground mb-6"
        >
          Members verified from
        </motion.p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-wrap items-center justify-center gap-2.5"
        >
          {K_COMPANIES.map((c) => (
            <motion.div
              key={c.value}
              variants={fadeUp}
              className="px-4 py-2 rounded-full bg-card border border-border shadow-xs text-xs sm:text-sm text-foreground/85 hover:shadow-sm hover:border-orange-200 transition"
            >
              <span className="font-medium">{c.value}</span>
              <span className="text-muted-foreground"> — {c.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* TRUST */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <ShieldCheck className="size-3" /> Trust
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              The first marketplace where{" "}
              <span className="gradient-text-orange">every member is verified.</span>
            </h2>
            <p className="text-muted-foreground text-pretty">
              We don't just check an email — we lock the front door entirely.
              Only K-Company corporate domains can register. No public sign-ups.
              No bots. No scammers.
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { icon: Lock, title: "Corporate-email gate", body: "Domain check at registration plus DB-level enforcement. Strangers can't open an account." },
                { icon: BadgeCheck, title: "Verified badge on every profile", body: "Shown next to the seller's name on every listing, message, and review." },
                { icon: Bot, title: "AI fraud + duplicate guard", body: "Every new listing is scored for risk and checked for near-duplicates before it goes live." },
                { icon: Eye, title: "Human admin moderation", body: "Reports route to a real moderator queue with one-click takedowns." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 size-8 grid place-items-center rounded-lg bg-primary-soft text-primary border border-orange-100 shrink-0">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-muted-foreground text-pretty">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link href="/trust">
                  Read the full trust policy <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-orange-200 to-blue-100 rounded-[2rem] blur-2xl opacity-50" />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-3xl bg-card border border-border shadow-lg p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="relative size-12 rounded-full overflow-hidden ring-2 ring-white shadow-sm shrink-0">
                  <Image
                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=facearea&facepad=2.4&w=160&h=160&q=80"
                    alt="Fatma Al-Mutairi"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground">Fatma Al-Mutairi</p>
                    <BadgeCheck className="size-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    KOC · Drilling Supervisor · 12 yrs
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
                  <p className="text-sm font-semibold text-foreground">★ 5.0 · 19</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Listings", val: "8" },
                  { label: "Sold", val: "23" },
                  { label: "Disputes", val: "0" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl bg-muted border border-border">
                    <p className="text-lg font-semibold font-display tabular-nums text-foreground">{s.val}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3 bg-blue-50 border border-blue-100 flex items-start gap-2 text-xs">
                <ShieldCheck className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-blue-900">
                  <span className="font-medium">Verified employee.</span>{" "}
                  Email confirmed against KOC corporate domain. Member since 2024.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-orange-100 text-xs text-orange-700 mb-4">
            <Sparkles className="size-3" /> What you get
          </div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
            Built specifically for{" "}
            <span className="gradient-text-orange">the people inside.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Marketplace tools that match how your team already works — without
            the noise of a public network.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {[
            { icon: ShoppingBag, title: "Products & gear", body: "Cars, electronics, furniture, safety equipment — list anything with photos, condition and KWD pricing." },
            { icon: Wrench, title: "Services & requests", body: "Tutoring, translation, IT help, consulting — offer side work or post requests for help." },
            { icon: MessageSquare, title: "In-app messaging", body: "Realtime chat tied to every listing. No phone numbers leaked, no off-platform handoffs." },
            { icon: Bot, title: "AI listing assistant", body: "Auto-write descriptions, generate titles, suggest fair prices, and detect duplicates before you post." },
            { icon: ShieldCheck, title: "Fraud-scored at upload", body: "Every listing gets a risk score the moment it's published. Suspicious posts surface in the admin queue." },
            { icon: BadgeCheck, title: "Verified badges everywhere", body: "Profile, listing, chat header — you always know you're talking to a real, current employee." },
          ].map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group p-7 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute -top-20 -right-20 size-40 rounded-full bg-orange-100 blur-3xl opacity-0 group-hover:opacity-80 transition-opacity duration-700" />
              <div className="relative size-11 grid place-items-center rounded-2xl bg-primary-soft text-primary border border-orange-100 mb-5 group-hover:scale-105 transition-transform">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold relative text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground text-pretty relative">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Three steps to start trading
          </h2>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid lg:grid-cols-3 gap-5 relative"
        >
          <div className="hidden lg:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
          {[
            { n: "01", title: "Verify with your work email", body: "Use your @kpc.com.kw, @kockw.com, @knpc.com or any other K-Company address. Anyone else is locked out." },
            { n: "02", title: "Post in 60 seconds", body: "Drop a photo and a phrase — AI drafts the title, description, category, and a fair price suggestion." },
            { n: "03", title: "Chat, meet, done", body: "Negotiate inside the platform with a verified colleague. Trade in person or arrange a handoff." },
          ].map((s) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              className="relative p-8 rounded-3xl bg-card border border-border shadow-sm"
            >
              <div className="inline-flex items-center justify-center size-9 rounded-xl bg-primary-soft text-primary font-display font-semibold text-sm border border-orange-100 mb-4">
                {s.n}
              </div>
              <h3 className="text-xl font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">{s.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* VOICES */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="grid lg:grid-cols-3 gap-5"
        >
          {[
            {
              q: "Finally somewhere I can sell my old gear without 30 anonymous lowball offers. Everyone I've dealt with has been a colleague I've met in the hallway.",
              name: "Ahmed Al-Sabah",
              role: "Process Engineer · KNPC",
              photo: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=facearea&facepad=2.4&w=160&h=160&q=80",
            },
            {
              q: "I posted a Land Cruiser on Friday and had three serious inquiries by Sunday — all verified employees, all from the same network.",
              name: "Fatma Al-Mutairi",
              role: "Drilling Supervisor · KOC",
              photo: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=facearea&facepad=2.4&w=160&h=160&q=80",
            },
            {
              q: "The AI title and price suggestions are unreal. I went from rough draft to live listing in under a minute.",
              name: "Mona Al-Khalifa",
              role: "Strategic Sourcing Manager · KPC",
              photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=2.4&w=160&h=160&q=80",
            },
          ].map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="p-8 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-500"
            >
              <Flame className="size-5 text-primary mb-4" />
              <p className="text-foreground/90 leading-relaxed text-pretty">
                &ldquo;{t.q}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-border">
                <div className="relative size-11 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                  <Image
                    src={t.photo}
                    alt={t.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {t.name}
                    <BadgeCheck className="size-3.5 text-blue-600" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* PROMISE */}
      <section className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid sm:grid-cols-3 gap-3 max-w-4xl mx-auto"
        >
          {[
            { title: "0% commission", body: "We take no cut from your trade." },
            { title: "Free for members", body: "Always free for verified K-Co employees." },
            { title: "Encrypted at rest", body: "Postgres + SSL on every layer." },
          ].map((p) => (
            <div key={p.title} className="p-5 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3">
              <span className="size-9 grid place-items-center rounded-xl bg-emerald-50 border border-emerald-100">
                <CircleCheckBig className="size-4 text-emerald-600" />
              </span>
              <div>
                <p className="font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-50 via-card to-blue-50 border border-border p-12 lg:p-20 text-center shadow-sm"
        >
          <Building2 className="absolute -top-10 -right-10 size-72 text-orange-200/50" />
          <div className="relative space-y-5">
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              Your colleagues are already trading.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              Take 60 seconds. Confirm your work email. Browse what's
              available right now in the K-Companies network.
            </p>
            <div className="flex justify-center gap-3 pt-2 flex-wrap">
              <Button asChild size="xl">
                <Link href={isDemo ? "/marketplace" : "/register"}>
                  {isDemo ? "Enter demo" : "Create account"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="container py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground border-t border-border">
        <Logo showWord />
        <div className="flex items-center gap-5">
          <Link href="/trust" className="hover:text-foreground transition-colors">Trust & safety</Link>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
        </div>
        <p>© {new Date().getFullYear()} PetroConnect · Built in Kuwait.</p>
      </footer>
    </div>
  );
}
