import type { Profile } from "@/types/database";

export type TrustTier = "newcomer" | "trusted" | "pro" | "elite";

/**
 * Mirror of the SQL trust_score() so the client can show a tier even
 * when we haven't pulled it through `profiles_with_trust`. Kept in
 * sync with /supabase/trust_system.sql. If you change one, change both.
 */
export function clientTrustScore(p: Pick<
  Profile,
  "is_verified" | "rating_avg" | "rating_count" | "created_at"
> & { listings_sold?: number }): number {
  const verified = p.is_verified ? 1 : 0;
  const rating = (p.rating_avg ?? 0) / 5;
  const volume = Math.min(1, Math.log1p(p.rating_count ?? 0) / Math.log(20));
  const sold = Math.min(
    1,
    Math.log1p(p.listings_sold ?? 0) / Math.log(15),
  );
  const ageDays =
    (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  const tenure = Math.min(1, Math.max(0, ageDays / 180));

  const score =
    verified * 30 + rating * 25 + volume * 20 + sold * 15 + tenure * 10;
  return Math.round(score);
}

export function trustTier(score: number | null | undefined): TrustTier {
  const s = score ?? 0;
  if (s >= 85) return "elite";
  if (s >= 60) return "pro";
  if (s >= 30) return "trusted";
  return "newcomer";
}
