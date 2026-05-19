import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt } from "lucide-react";
import { formatKWD, formatRelative } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  amount: number | string;
  platform_fee: number | string;
  total: number | string;
  completed_at: string;
  listing: { id: string; title: string } | null;
  buyer:  { full_name: string | null; company: string | null } | null;
  seller: { full_name: string | null; company: string | null } | null;
}

export default async function AdminTransactionsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, amount, platform_fee, total, completed_at,
       listing:listings(id, title),
       buyer:profiles!buyer_id(full_name, company),
       seller:profiles!seller_id(full_name, company)`,
    )
    .order("completed_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <p className="text-sm text-rose-600">
        Could not load transactions: {error.message}
      </p>
    );
  }

  const rows = (data ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-5" />}
        title="No completed trades yet"
        description="The first successful payment will reify here as a transaction."
      />
    );
  }

  const totalVolume = rows.reduce((acc, r) => acc + Number(r.total ?? 0), 0);
  const totalFees = rows.reduce(
    (acc, r) => acc + Number(r.platform_fee ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Completed trades</h2>
          <p className="text-sm text-muted-foreground">
            Each row is a finalised transaction backed by a paid payment.
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-muted-foreground">
            Volume:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatKWD(totalVolume)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Fee revenue:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatKWD(totalFees)}
            </span>
          </span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                <tr>
                  <th className="px-5 py-3 font-medium">Listing</th>
                  <th className="px-5 py-3 font-medium">Buyer</th>
                  <th className="px-5 py-3 font-medium">Seller</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Fee</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 max-w-[260px]">
                      {r.listing ? (
                        <Link
                          href={`/listings/${r.listing.id}`}
                          className="font-medium hover:text-primary line-clamp-1"
                        >
                          {r.listing.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p>{r.buyer?.full_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.buyer?.company ?? ""}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p>{r.seller?.full_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.seller?.company ?? ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {formatKWD(Number(r.amount))}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">
                      {formatKWD(Number(r.platform_fee))}
                    </td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-primary">
                      {formatKWD(Number(r.total))}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {formatRelative(r.completed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
