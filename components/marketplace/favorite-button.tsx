"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export function FavoriteButton({
  listingId,
  initiallyFavorited = false,
  className,
}: {
  listingId: string;
  initiallyFavorited?: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to save items");
        setFavorited(!next);
        return;
      }
      if (next) {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) {
          setFavorited(false);
          toast.error("Could not save");
        }
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) {
          setFavorited(true);
          toast.error("Could not remove");
        }
      }
    });
  }

  return (
    <button
      onClick={toggle}
      aria-label={favorited ? "Remove from saved" : "Save"}
      className={cn(
        "size-9 grid place-items-center rounded-full glass-strong border border-white/10 transition",
        "hover:bg-white/[0.12] ring-focus",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          favorited ? "fill-red-500 text-red-500" : "text-white",
        )}
      />
    </button>
  );
}
