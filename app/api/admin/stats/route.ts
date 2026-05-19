import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 60;

interface CountRow {
  created_at: string;
}
interface PriceRow {
  total: number | string;
  completed_at: string;
}
interface CategoryAgg {
  category_id: string | null;
  category: { name: string | null } | null;
}
interface CompanyAgg { company: string | null }

export interface AdminStatsPayload {
  totals: {
    users: number;
    verified_users: number;
    active_users_7d: number;
    new_users_30d: number;
    listings_total: number;
    listings_active: number;
    listings_reserved: number;
    listings_sold: number;
    payments_paid: number;
    payments_failed: number;
    transactions_total: number;
    transaction_value_kwd: number;
    average_transaction_value_kwd: number;
    platform_fee_revenue_kwd: number;
    open_reports: number;
    high_risk_listings: number;
    avg_seller_rating: number;
  };
  rates: {
    listing_to_sale_conversion: number;   // 0..1
    trade_completion_rate: number;        // 0..1
    fraud_risk_share: number;             // 0..1
  };
  series: {
    day: string;          // YYYY-MM-DD
    users: number;
    listings: number;
    transactions: number;
    value_kwd: number;
  }[];
  breakdowns: {
    by_category: { name: string; count: number }[];
    by_company:  { name: string; count: number }[];
    sales_by_company: { name: string; total_kwd: number; trades: number }[];
  };
  health: {
    score: number;
    delta_30d: number;
    factors: { label: string; value: number; weight: number }[];
    insight: string;
  };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildSeries(
  days: number,
  userRows: CountRow[],
  listingRows: CountRow[],
  txRows: PriceRow[],
) {
  const out: AdminStatsPayload["series"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const sameDay = (s: string) => s.startsWith(key);

    const txMatches = txRows.filter((r) => sameDay(r.completed_at));
    const value = txMatches.reduce((acc, r) => acc + Number(r.total ?? 0), 0);

    out.push({
      day: key.slice(5),
      users: userRows.filter((r) => sameDay(r.created_at)).length,
      listings: listingRows.filter((r) => sameDay(r.created_at)).length,
      transactions: txMatches.length,
      value_kwd: Math.round(value * 1000) / 1000,
    });
  }
  return out;
}

export async function GET() {
  // Admin-only — gate via the requireAdmin helper.
  await requireAdmin();

  const supabase = await createClient();

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Iso = since30.toISOString();

  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const since7Iso = since7.toISOString();

  const sinceSeries = new Date();
  sinceSeries.setDate(sinceSeries.getDate() - 14);
  const sinceSeriesIso = sinceSeries.toISOString();

  // Fan-out — head:true count queries are cheap.
  const [
    users,
    verifiedUsers,
    newUsers30,
    activeUsers7,
    listingsTotal,
    listingsActive,
    listingsReserved,
    listingsSold,
    paymentsPaid,
    paymentsFailed,
    txTotal,
    openReports,
    highRisk,
    avgRating,
    txPriceRows,
    userPoints,
    listingPoints,
    catRows,
    companyRows,
    salesCompanyRows,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30Iso),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since7Iso),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).not("reserved_for", "is", null).eq("status", "paused"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("listings").select("id", { count: "exact", head: true }).gte("ai_score", 0.6),
    supabase.from("profiles").select("rating_avg"),
    supabase.from("transactions").select("total, platform_fee, completed_at"),
    supabase.from("profiles").select("created_at").gte("created_at", sinceSeriesIso),
    supabase.from("listings").select("created_at").gte("created_at", sinceSeriesIso),
    supabase.from("listings").select("category_id, category:categories(name)"),
    supabase.from("profiles").select("company"),
    supabase
      .from("transactions")
      .select("total, seller:profiles!seller_id(company)")
      .limit(500),
  ]);

  const ratings = (avgRating.data ?? [])
    .map((r) => Number((r as { rating_avg: number | null }).rating_avg ?? 0))
    .filter((n) => n > 0);
  const avg_seller_rating =
    ratings.length === 0
      ? 0
      : Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;

  const txRows = ((txPriceRows.data ?? []) as Array<{
    total: number | string;
    platform_fee: number | string;
    completed_at: string;
  }>);
  const transaction_value_kwd =
    Math.round(
      txRows.reduce((acc, r) => acc + Number(r.total ?? 0), 0) * 1000,
    ) / 1000;
  const platform_fee_revenue_kwd =
    Math.round(
      txRows.reduce((acc, r) => acc + Number(r.platform_fee ?? 0), 0) * 1000,
    ) / 1000;
  const average_transaction_value_kwd =
    txRows.length === 0 ? 0 : Math.round((transaction_value_kwd / txRows.length) * 1000) / 1000;

  const totals: AdminStatsPayload["totals"] = {
    users: users.count ?? 0,
    verified_users: verifiedUsers.count ?? 0,
    active_users_7d: activeUsers7.count ?? 0,
    new_users_30d: newUsers30.count ?? 0,
    listings_total: listingsTotal.count ?? 0,
    listings_active: listingsActive.count ?? 0,
    listings_reserved: listingsReserved.count ?? 0,
    listings_sold: listingsSold.count ?? 0,
    payments_paid: paymentsPaid.count ?? 0,
    payments_failed: paymentsFailed.count ?? 0,
    transactions_total: txTotal.count ?? 0,
    transaction_value_kwd,
    average_transaction_value_kwd,
    platform_fee_revenue_kwd,
    open_reports: openReports.count ?? 0,
    high_risk_listings: highRisk.count ?? 0,
    avg_seller_rating,
  };

  const rates: AdminStatsPayload["rates"] = {
    listing_to_sale_conversion:
      totals.listings_total === 0
        ? 0
        : totals.listings_sold / totals.listings_total,
    trade_completion_rate:
      totals.payments_paid + totals.payments_failed === 0
        ? 0
        : totals.payments_paid /
          (totals.payments_paid + totals.payments_failed),
    fraud_risk_share:
      totals.listings_total === 0
        ? 0
        : totals.high_risk_listings / totals.listings_total,
  };

  // 14-day series
  const series = buildSeries(
    14,
    (userPoints.data ?? []) as CountRow[],
    (listingPoints.data ?? []) as CountRow[],
    txRows.map((r) => ({ total: r.total, completed_at: r.completed_at })) as PriceRow[],
  );

  // Breakdowns ------------------------------------------------------------
  const byCategoryMap = new Map<string, number>();
  for (const row of (catRows.data ?? []) as unknown as CategoryAgg[]) {
    const name = row.category?.name ?? "Uncategorised";
    byCategoryMap.set(name, (byCategoryMap.get(name) ?? 0) + 1);
  }
  const by_category = Array.from(byCategoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const byCompanyMap = new Map<string, number>();
  for (const row of (companyRows.data ?? []) as CompanyAgg[]) {
    const name = row.company ?? "Other";
    byCompanyMap.set(name, (byCompanyMap.get(name) ?? 0) + 1);
  }
  const by_company = Array.from(byCompanyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const salesByCompanyMap = new Map<string, { total: number; trades: number }>();
  for (const row of (salesCompanyRows.data ?? []) as unknown as Array<{
    total: number | string;
    seller: { company: string | null } | null;
  }>) {
    const name = row.seller?.company ?? "Other";
    const cur = salesByCompanyMap.get(name) ?? { total: 0, trades: 0 };
    cur.total += Number(row.total ?? 0);
    cur.trades += 1;
    salesByCompanyMap.set(name, cur);
  }
  const sales_by_company = Array.from(salesByCompanyMap.entries())
    .map(([name, v]) => ({ name, total_kwd: Math.round(v.total * 1000) / 1000, trades: v.trades }))
    .sort((a, b) => b.total_kwd - a.total_kwd);

  // Health score -----------------------------------------------------------
  // Five 0..1 factors, weighted to 100.
  const activity = clamp01(totals.active_users_7d / Math.max(50, totals.users * 0.3));
  const trust = clamp01(totals.verified_users / Math.max(1, totals.users));
  const conversion = clamp01(rates.trade_completion_rate * 1.1);
  const reputation = clamp01(totals.avg_seller_rating / 5);
  const safety = clamp01(
    1 - (totals.open_reports * 0.05 + rates.fraud_risk_share * 1.5),
  );

  const factors = [
    { label: "Activity",   value: activity,   weight: 25 },
    { label: "Trust",      value: trust,      weight: 25 },
    { label: "Conversion", value: conversion, weight: 20 },
    { label: "Reputation", value: reputation, weight: 15 },
    { label: "Safety",     value: safety,     weight: 15 },
  ];
  const score = Math.round(
    factors.reduce((acc, f) => acc + f.value * f.weight, 0),
  );

  const insight = generateInsight(score, factors, totals, rates);

  // 30-day delta — naive: compare new_users last 30d vs previous 30
  const delta_30d = totals.new_users_30d > 0 ? +1 : 0;

  const payload: AdminStatsPayload = {
    totals,
    rates,
    series,
    breakdowns: { by_category, by_company, sales_by_company },
    health: { score, delta_30d, factors, insight },
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

function generateInsight(
  score: number,
  factors: { label: string; value: number; weight: number }[],
  totals: AdminStatsPayload["totals"],
  rates: AdminStatsPayload["rates"],
): string {
  const weakest = [...factors].sort((a, b) => a.value - b.value)[0];
  const headline =
    score >= 80
      ? "Marketplace health is strong"
      : score >= 60
      ? "Marketplace is healthy"
      : score >= 40
      ? "Marketplace is stabilising"
      : "Marketplace needs attention";

  const hint = (() => {
    switch (weakest?.label) {
      case "Activity":
        return "drive more sellers to refresh older listings to lift engagement";
      case "Trust":
        return "approve pending verifications and onboard more company domains";
      case "Conversion":
        return `convert more offers — only ${Math.round(rates.trade_completion_rate * 100)}% of payments closed`;
      case "Reputation":
        return "encourage post-trade reviews to lift the average rating";
      case "Safety":
        return `${totals.open_reports} reports and ${totals.high_risk_listings} high-risk listings are pending`;
      default:
        return "all indicators look stable";
    }
  })();

  return `${headline} at ${score}/100. To climb higher, ${hint}.`;
}
