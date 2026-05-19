import { requireProfile } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DemoBanner } from "@/components/layout/demo-banner";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { CommandPalette } from "@/components/command/command-palette";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <div className="flex flex-1 min-h-0">
        <Sidebar isAdmin={profile.role === "admin"} userId={profile.id} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar profile={profile} />
          <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-10">
            {children}
          </main>
        </div>
      </div>
      <MobileNav profileId={profile.id} />
      <WelcomeModal profile={profile} />
      <CommandPalette />
    </div>
  );
}
