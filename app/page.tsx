import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Lock,
  MessageSquare,
  Sparkles,
  Wrench,
  ShoppingBag,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { K_COMPANIES } from "@/lib/constants";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <header className="container py-5 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#trust" className="hover:text-foreground">Trust</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative container pt-12 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-radial-glow" />
        <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            For verified employees of Kuwait's K-Companies
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance">
            The trusted marketplace for{" "}
            <span className="bg-gradient-to-br from-primary via-blue-400 to-blue-200 bg-clip-text text-transparent">
              Kuwait's oil sector
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Buy, sell, and exchange services with verified colleagues across
            KPC, KOC, KNPC, KIPIC, PIC and more — inside one secure professional
            community.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild size="xl">
              <Link href="/register">
                Join PetroConnect <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Registration limited to verified K-Company emails.
          </p>
        </div>

        {/* Floating preview card */}
        <div className="relative mt-16 max-w-5xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-3xl blur-2xl opacity-50" />
          <div className="relative rounded-3xl glass-strong p-3 shadow-glass">
            <div className="rounded-2xl bg-navy-950 overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-1 p-1">
              {[
                "Toyota Land Cruiser GXR 2018",
                "iPhone 15 Pro Max 256GB",
                "Engineering consultancy",
                "Office chair (Herman Miller)",
              ].map((title, i) => (
                <div
                  key={title}
                  className="aspect-[4/3] rounded-xl p-4 flex flex-col justify-end bg-gradient-to-br from-navy-800 to-navy-950 border border-white/5 animate-float"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <p className="text-xs text-muted-foreground">Listing #{i + 1}</p>
                  <p className="text-sm font-medium line-clamp-2">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPANIES */}
      <section id="trust" className="container py-10">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Verified employees from
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {K_COMPANIES.map((c) => (
            <div
              key={c.value}
              className="px-4 py-2 rounded-full glass text-xs sm:text-sm font-medium text-foreground/80"
            >
              {c.value} <span className="text-muted-foreground">— {c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            A safer marketplace, built for your team
          </h2>
          <p className="mt-3 text-muted-foreground">
            Only verified K-Company employees can buy, sell, or contact other
            members. No spam, no scams, no strangers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Lock,
              title: "Verified-only access",
              body: "Registration requires a valid K-Company corporate email — every member is a colleague.",
            },
            {
              icon: ShoppingBag,
              title: "Products & gear",
              body: "List anything from cars to safety equipment with photos, condition, and KWD pricing.",
            },
            {
              icon: Wrench,
              title: "Services & requests",
              body: "Offer side-services or request help — tutoring, translation, consulting, logistics.",
            },
            {
              icon: MessageSquare,
              title: "Real-time chat",
              body: "Negotiate, ask questions, and arrange handoffs inside the platform — no phone numbers leaked.",
            },
            {
              icon: Sparkles,
              title: "AI assistance",
              body: "Auto-write descriptions, suggest categories, and surface personalized recommendations.",
            },
            {
              icon: BadgeCheck,
              title: "Fraud detection",
              body: "Suspicious listings are automatically flagged and reviewed before they spread.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="p-6 rounded-2xl glass hover:shadow-glow transition-all hover:-translate-y-0.5"
            >
              <div className="size-10 grid place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              title: "Verify with your work email",
              body: "Use your @kpc.com.kw, @kockw.com, @knpc.com, @kipic.com.kw or other K-Company address.",
            },
            {
              n: "02",
              title: "Post a listing in seconds",
              body: "AI drafts your description and suggests the right category from a short prompt.",
            },
            {
              n: "03",
              title: "Chat & meet safely",
              body: "Use in-app messaging to agree on price and pickup with verified colleagues.",
            },
          ].map((s) => (
            <div key={s.n} className="p-8 rounded-2xl glass-strong">
              <p className="text-xs text-primary font-semibold tracking-widest">
                STEP {s.n}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-10 lg:p-16 text-center">
          <Building2 className="absolute -top-10 -right-10 size-64 text-primary/5" />
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Ready to join your colleagues?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Thousands of verified employees buying, selling, and helping each
            other every day.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="xl">
              <Link href="/register">Create account</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="container py-10 flex items-center justify-between text-xs text-muted-foreground border-t border-white/5">
        <Logo showWord />
        <p>© {new Date().getFullYear()} PetroConnect. Built in Kuwait.</p>
      </footer>
    </div>
  );
}
