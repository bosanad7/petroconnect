import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatKWD, formatRelative } from "@/lib/utils/format";
import { CreditCard } from "lucide-react";
import type { PaymentStatus } from "@/types/database";

export interface AdminPaymentRow {
  id: string;
  amount: number | string;
  platform_fee: number | string;
  total: number | string;
  status: PaymentStatus;
  provider: string;
  created_at: string;
  paid_at: string | null;
  listing: { id: string; title: string } | null;
  buyer:  { id: string; full_name: string | null; company: string | null } | null;
  seller: { id: string; full_name: string | null; company: string | null } | null;
}

export function AdminPaymentTable({ rows }: { rows: AdminPaymentRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="size-5" />}
        title="No payments yet"
        description="As soon as a buyer completes a checkout, it'll appear here."
      />
    );
  }
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
              <tr>
                <th className="px-5 py-3 font-medium">Listing</th>
                <th className="px-5 py-3 font-medium">Buyer</th>
                <th className="px-5 py-3 font-medium">Seller</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Fee</th>
                <th className="px-5 py-3 font-medium">Provider</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 max-w-[280px]">
                    {r.listing ? (
                      <Link
                        href={`/listings/${r.listing.id}`}
                        className="font-medium hover:text-primary line-clamp-1"
                      >
                        {r.listing.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-foreground">{r.buyer?.full_name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.buyer?.company ?? ""}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-foreground">{r.seller?.full_name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.seller?.company ?? ""}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold tabular-nums">
                    {formatKWD(Number(r.total))}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">
                    {formatKWD(Number(r.platform_fee))}
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">
                    {r.provider}
                  </td>
                  <td className="px-5 py-3">
                    <PaymentStatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                    {formatRelative(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
