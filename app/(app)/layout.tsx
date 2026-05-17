import { requireProfile } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen flex">
      <Sidebar isAdmin={profile.role === "admin"} userId={profile.id} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav profileId={profile.id} />
    </div>
  );
}
