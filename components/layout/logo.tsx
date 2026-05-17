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
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="relative grid place-items-center size-9 rounded-xl bg-gradient-to-br from-primary to-blue-500 shadow-glow">
        <Flame className="size-5 text-primary-foreground" />
      </span>
      {showWord && (
        <span className="text-base">
          Petro<span className="text-primary">Connect</span>
        </span>
      )}
    </Link>
  );
}
