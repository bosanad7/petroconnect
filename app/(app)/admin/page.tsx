import { Users, ShoppingBag, Flag, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsChart } from "@/components/admin/analytics-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { count: userCount },
    { count: listingCount },
    { count: openReports },
    { count: highRisk },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .gte("ai_score", 0.6),
  ]);

  // 14-day signups + listings series
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const { data: userPoints } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", since.toISOString());

  const { data: listingPoints } = await supabase
    .from("listings")
    .select("created_at")
    .gte("created_at", since.toISOString());

  const series: { day: string; users: number; listings: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      day: key.slice(5),
      users: (userPoints ?? []).filter((p) =>
        p.created_at.startsWith(key),
      ).length,
      listings: (listingPoints ?? []).filter((p) =>
        p.created_at.startsWith(key),
      ).length,
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform health at a glance.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={<Users className="size-5" />}
          label="Members"
          value={userCount ?? 0}
        />
        <Stat
          icon={<ShoppingBag className="size-5" />}
          label="Active listings"
          value={listingCount ?? 0}
        />
        <Stat
          icon={<Flag className="size-5" />}
          label="Open reports"
          value={openReports ?? 0}
          tone="warning"
        />
        <Stat
          icon={<AlertTriangle className="size-5" />}
          label="High-risk listings"
          value={highRisk ?? 0}
          tone="danger"
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">Last 14 days</h2>
          <AnalyticsChart data={series} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "warning" | "danger";
}) {
  const tint =
    tone === "danger"
      ? "from-red-500/20 to-red-500/5 text-red-400 border-red-500/30"
      : tone === "warning"
      ? "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30"
      : "from-primary/20 to-primary/5 text-primary border-primary/30";
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`size-12 grid place-items-center rounded-xl bg-gradient-to-br ${tint} border`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
