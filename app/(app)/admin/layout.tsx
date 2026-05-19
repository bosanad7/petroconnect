import { requireAdmin } from "@/lib/supabase/auth";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Command center</h1>
        <p className="text-sm text-muted-foreground">
          Operational health, payments, members, and moderation in one place.
        </p>
      </div>
      <AdminTabs />
      <div className="pt-2">{children}</div>
    </div>
  );
}
