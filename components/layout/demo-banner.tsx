import { Sparkles } from "lucide-react";

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  return (
    <div className="bg-primary-soft border-b border-orange-100 px-4 py-2 text-center text-xs text-orange-700 flex items-center justify-center gap-2">
      <Sparkles className="size-3.5 text-primary" />
      <span>
        <strong className="text-primary">Demo mode</strong> — signed in as{" "}
        <strong>Rashed Al-Rashed</strong> with mock listings. Disable in{" "}
        <code className="px-1 rounded bg-white/70 border border-orange-100">.env.local</code> when you wire up Supabase.
      </span>
    </div>
  );
}
