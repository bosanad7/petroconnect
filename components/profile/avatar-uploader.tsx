"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/supabase/storage";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Props {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  editable: boolean;
  className?: string;
  size?: "md" | "lg";
}

export function AvatarUploader({
  userId,
  fullName,
  avatarUrl,
  editable,
  className,
  size = "lg",
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(avatarUrl);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadAvatar(userId, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (error) throw error;
      setCurrent(url);
      toast.success("Avatar updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const dim = size === "lg" ? "size-20" : "size-12";

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={cn(dim, "ring-2 ring-primary/40")}>
        <AvatarImage src={current ?? undefined} />
        <AvatarFallback className="text-lg">
          {initials(fullName)}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute -bottom-1 -right-1 size-8 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_rgba(56,112,255,0.6)] hover:brightness-110 disabled:opacity-60 transition"
            aria-label="Change avatar"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
