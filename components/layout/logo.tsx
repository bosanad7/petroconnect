import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <Link
      href="/marketplace"
      className={cn(
        "inline-flex items-center gap-2.5 font-display font-semibold tracking-tight group",
        className,
      )}
    >
      <span
        className="relative grid place-items-center size-9 rounded-xl text-white shadow-orange group-hover:brightness-105 transition"
        style={{
          background:
            "linear-gradient(140deg, #FF8533 0%, #FF6A00 55%, #E55A00 100%)",
        }}
      >
        <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/30 to-transparent opacity-70" />
        <Flame className="relative size-5 drop-shadow-sm" />
      </span>
      {showWord && (
        <span className="text-[15px] text-foreground">
          Petro<span className="text-primary">Connect</span>
        </span>
      )}
    </Link>
  );
}
