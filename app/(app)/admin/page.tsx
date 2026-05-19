import {
  Users,
  ShoppingBag,
  Flag,
  AlertTriangle,
  Lock,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { requireAdmin } from "@/lib/supabase/auth";
import type { AdminStatsPayload } from "@/app/api/admin/stats/route";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueStatsCards } from "@/components/admin/revenue-stats-cards";
import { MarketplaceHealthCard } from "@/components/admin/marketplace-health-card";
import { BreakdownCharts } from "@/components/admin/breakdown-charts";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function fetchStats(): Promise<AdminStatsPayload | null> {
  // Internal fetch with forwarded auth cookies so the requireAdmin
  // check in the API route runs against the same session.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3001";
  const cookie = h.get("cookie") ?? "";

  try {
    const res = await fetch(`${proto}://${host}/api/admin/stats`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminStatsPayload;
  } catch {
    return null;
  }
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const stats = await fetchStats();

  // Graceful: if the API didn't return for whatever reason, render an
  // empty shell instead of crashing the dashboard.
  if (!stats) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Couldn't load stats. Check the server logs for `/api/admin/stats`.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totals, rates, series, breakdowns, health } = stats;

  return (
    <div className="space-y-6">
      {/* Marketplace health */}
      <MarketplaceHealthCard
        score={health.score}
        delta={health.delta_30d}
        factors={health.factors}
        insight={health.insight}
      />

      {/* Top KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="size-5" />}
          label="Verified members"
          value={totals.verified_users}
          delay={0}
        />
        <StatCard
          icon={<ShoppingBag className="size-5" />}
          label="Active listings"
          value={totals.listings_active}
          delay={0.06}
        />
        <StatCard
          icon={<PackageCheck className="size-5" />}
          label="Trades completed"
          value={totals.transactions_total}
          delay={0.12}
        />
        <StatCard
          icon={<AlertTriangle className="size-5" />}
          label="High-risk listings"
          value={totals.high_risk_listings}
          tone="danger"
          delay={0.18}
        />
      </div>

      {/* Revenue strip */}
      <RevenueStatsCards totals={totals} />

      {/* Secondary KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RateCard
          label="Listing → sale"
          value={rates.listing_to_sale_conversion}
          icon={<Sparkles className="size-4" />}
        />
        <RateCard
          label="Payment success"
          value={rates.trade_completion_rate}
          icon={<Lock className="size-4" />}
        />
        <RateCard
          label="Fraud risk share"
          value={rates.fraud_risk_share}
          tone="danger"
          icon={<AlertTriangle className="size-4" />}
        />
        <RateCard
          label="Avg seller rating"
          value={totals.avg_seller_rating / 5}
          display={totals.avg_seller_rating.toFixed(2)}
          icon={<Flag className="size-4" />}
        />
      </div>

      {/* 14-day series */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold">Last 14 days</h2>
            <p className="text-xs text-muted-foreground">
              Daily signups, listings, and transactions
            </p>
          </div>
          <AnalyticsChart
            data={series.map((s) => ({
              day: s.day,
              users: s.users,
              listings: s.listings,
            }))}
          />
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <BreakdownCharts
        byCategory={breakdowns.by_category}
        byCompany={breakdowns.by_company}
        salesByCompany={breakdowns.sales_by_company}
      />
    </div>
  );
}

function RateCard({
  label,
  value,           // 0..1
  display,
  tone,
  icon,
}: {
  label: string;
  value: number;
  display?: string;
  tone?: "danger";
  icon: React.ReactNode;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const ringColor =
    tone === "danger"
      ? "from-rose-100 to-rose-50 text-rose-600 border-rose-100"
      : "from-orange-100 to-orange-50 text-orange-600 border-orange-100";
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`size-12 grid place-items-center rounded-xl bg-gradient-to-br border ${ringColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-display font-semibold tabular-nums">
            {display ?? `${pct}%`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
