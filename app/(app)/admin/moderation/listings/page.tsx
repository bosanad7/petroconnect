import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingModerationActions } from "@/components/admin/listing-moderation-actions";
import { ModerationSubnav } from "@/components/admin/moderation-subnav";
import { formatKWD, formatRelative } from "@/lib/utils/format";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  description: string;
  price_kwd: number | null;
  images: string[];
  created_at: string;
  moderation_status: "approved" | "pending_review" | "rejected";
  moderation_reason: string | null;
  flagged_reasons: string[];
  ai_score: number | null;
  seller: { id: string; full_name: string | null; company: string | null; email: string } | null;
  category: { name: string } | null;
}

const REASON_LABEL: Record<string, string> = {
  rapid_posting: "Posted many listings recently",
  very_high_price: "Unusually high price",
  very_low_price: "Unusually low price",
  banned_pattern: "Banned scam pattern in copy",
  duplicate_of_own_listing: "Duplicate of seller's existing listing",
};

export default async function AdminListingModerationPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `id, title, description, price_kwd, images, created_at,
       moderation_status, moderation_reason, flagged_reasons, ai_score,
       seller:profiles!seller_id(id, full_name, company, email),
       category:categories(name)`,
    )
    .eq("moderation_status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <p className="text-sm text-rose-600">
        Could not load moderation queue: {error.message}
      </p>
    );
  }

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <ModerationSubnav />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-600" />
            Listings awaiting review
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-flagged by the create_listing RPC. Approve to publish, reject to remove.
            Every decision goes to the admin audit log.
          </p>
        </div>
        <Badge variant="warning">
          {rows.length} pending
        </Badge>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Inbox clear"
          description="No listings are awaiting moderation right now."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                  {r.images?.[0] && (
                    <div className="relative size-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                      <Image src={r.images[0]} alt="" fill className="object-cover" sizes="80px" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/listings/${r.id}`}
                      target="_blank"
                      className="font-semibold text-foreground hover:text-primary line-clamp-1"
                    >
                      {r.title}
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {r.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                      <span>
                        Seller:{" "}
                        <Link href={`/profile/${r.seller?.id}`} className="text-foreground hover:underline">
                          {r.seller?.full_name ?? r.seller?.email}
                        </Link>{" "}
                        {r.seller?.company && <span>· {r.seller.company}</span>}
                      </span>
                      <span>Price: <span className="text-foreground tabular-nums">{formatKWD(r.price_kwd)}</span></span>
                      <span>Category: <span className="text-foreground">{r.category?.name ?? "—"}</span></span>
                      <span>Posted {formatRelative(r.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(r.flagged_reasons ?? []).map((tag) => (
                    <Badge key={tag} variant="warning" className="text-[10px]">
                      {REASON_LABEL[tag] ?? tag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                  {r.ai_score !== null && r.ai_score >= 0.4 && (
                    <Badge variant="danger" className="text-[10px]">
                      AI risk {(r.ai_score * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Approve to lift the moderation flag and let it stay live.
                    Reject to remove and notify the seller.
                  </p>
                  <ListingModerationActions listingId={r.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
