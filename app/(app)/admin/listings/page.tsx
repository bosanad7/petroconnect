import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKWD, formatRelative } from "@/lib/utils/format";
import type { ListingWithSeller } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*), category:categories(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (data ?? []) as ListingWithSeller[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <p className="text-sm text-muted-foreground">
          Latest 100 listings (all statuses).
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-white/5">
                <tr>
                  <th className="px-5 py-3">Listing</th>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">AI risk</th>
                  <th className="px-5 py-3">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((l) => {
                  const risk = l.ai_score ?? 0;
                  const riskTone =
                    risk >= 0.7 ? "danger" : risk >= 0.4 ? "warning" : "success";
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-3">
                        <Link
                          href={`/listings/${l.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {l.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {l.kind} · {l.category?.name ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3">{l.seller?.full_name}</td>
                      <td className="px-5 py-3">{formatKWD(l.price_kwd)}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline">{l.status}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={riskTone}>
                          {(risk * 100).toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatRelative(l.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
