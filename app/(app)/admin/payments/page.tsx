import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPaymentTable, type AdminPaymentRow } from "@/components/admin/admin-payment-table";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select(
      `id, amount, platform_fee, total, status, provider, created_at, paid_at,
       listing:listings(id, title),
       buyer:profiles!buyer_id(id, full_name, company),
       seller:profiles!seller_id(id, full_name, company)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <p className="text-sm text-rose-600">
        Could not load payments: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Payments</h2>
        <p className="text-sm text-muted-foreground">
          Every checkout attempt across the marketplace, regardless of status.
        </p>
      </div>
      <AdminPaymentTable rows={(data ?? []) as unknown as AdminPaymentRow[]} />
    </div>
  );
}
