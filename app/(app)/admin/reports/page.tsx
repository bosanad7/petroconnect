import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";
import { ReportActions } from "@/components/admin/report-actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select(
      `*, reporter:profiles!reporter_id(full_name, email),
           target:profiles!target_user_id(full_name),
           listing:listings(id, title)`,
    )
    .order("created_at", { ascending: false });

  const list = reports ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          User-submitted flags requiring review.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="All clear"
          description="No open reports right now."
        />
      ) : (
        <div className="grid gap-3">
          {list.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        r.status === "open"
                          ? "warning"
                          : r.status === "resolved"
                          ? "success"
                          : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                    <span className="text-sm font-medium">{r.reason}</span>
                  </div>
                  {r.details && (
                    <p className="text-sm text-muted-foreground">{r.details}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {/* @ts-expect-error nested */}
                    Reported by {r.reporter?.full_name ?? r.reporter?.email}
                    {/* @ts-expect-error nested */}
                    {r.listing && (
                      <>
                        {" · "}
                        <Link
                          // @ts-expect-error nested
                          href={`/listings/${r.listing.id}`}
                          className="text-primary hover:underline"
                        >
                          {/* @ts-expect-error nested */}
                          {r.listing.title}
                        </Link>
                      </>
                    )}{" "}
                    · {formatRelative(r.created_at)}
                  </p>
                </div>
                <ReportActions
                  reportId={r.id}
                  // @ts-expect-error nested
                  listingId={r.listing?.id ?? null}
                  currentStatus={r.status}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
