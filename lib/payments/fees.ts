/**
 * Client-side mirror of the SQL compute_fee() function. Keep in sync
 * with /supabase/payments.sql. The truth is the DB — but having it on
 * the client lets us show the breakdown on the checkout page without a
 * roundtrip.
 *
 * Current rule: 2.5% with no flat fee. Future tiers can be added either
 * here OR (better) loaded once from the platform_fees table.
 */
const DEFAULT_PERCENT = 2.5;
const DEFAULT_FLAT_KWD = 0;

export function computeFeeKwd(amountKwd: number): number {
  if (!Number.isFinite(amountKwd) || amountKwd <= 0) return 0;
  const fee = amountKwd * (DEFAULT_PERCENT / 100) + DEFAULT_FLAT_KWD;
  // Round to milli-dinars (KWD has 3 decimal places)
  return Math.round(fee * 1000) / 1000;
}

export function feeRateText(): string {
  return `${DEFAULT_PERCENT}%`;
}
