import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKWD } from "@/lib/utils/format";

export interface SummaryProps {
  listing: {
    title: string;
    images?: string[] | null;
    location?: string | null;
  };
  seller: { full_name?: string | null; company?: string | null };
  buyer:  { full_name?: string | null; email?: string | null };
  amount: number;
  platformFee: number;
  total: number;
  feeRateText?: string;
}

export function PaymentSummaryCard({
  listing,
  seller,
  buyer,
  amount,
  platformFee,
  total,
  feeRateText = "2.5%",
}: SummaryProps) {
  const cover = listing.images?.[0];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Item line */}
        <div className="flex items-start gap-4">
          {cover ? (
            <div className="relative size-16 sm:size-20 rounded-xl overflow-hidden shrink-0 bg-muted">
              <Image src={cover} alt="" fill className="object-cover" sizes="80px" />
            </div>
          ) : (
            <div className="size-16 sm:size-20 rounded-xl bg-muted shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Order
            </p>
            <h3 className="font-semibold text-foreground line-clamp-2">
              {listing.title}
            </h3>
            {listing.location && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Pickup · {listing.location}
              </p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Detail label="Seller" value={seller.full_name ?? "—"} sub={seller.company ?? undefined} />
          <Detail label="Buyer"  value={buyer.full_name  ?? "—"} sub={buyer.email   ?? undefined} />
        </div>

        {/* Price breakdown */}
        <div className="space-y-1.5 text-sm pt-2 border-t border-border">
          <Row label="Item price"                    value={formatKWD(amount)} />
          <Row label={`Platform fee (${feeRateText})`} value={formatKWD(platformFee)} />
          <Row
            label="Total due"
            value={formatKWD(total)}
            bold
          />
        </div>

        {/* Trust callout */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
          <ShieldCheck className="size-4 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Both buyer and seller are verified K-Company employees. Funds are
            held until both parties confirm the trade is complete.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 border border-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "pt-2 border-t border-border" : ""}`}>
      <span className={bold ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? "text-lg font-bold text-primary" : "text-foreground/90"}`}>
        {value}
      </span>
    </div>
  );
}
