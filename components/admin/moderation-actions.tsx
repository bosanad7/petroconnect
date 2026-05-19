"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ModerationActions({ messageId }: { messageId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();

  function run(action: "dismiss" | "hide" | "keep") {
    startTransition(async () => {
      const { error } = await supabase.rpc("resolve_flagged_message", {
        p_message: messageId,
        p_action: action,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(
        action === "dismiss"
          ? "Flag dismissed"
          : action === "hide"
          ? "Message hidden"
          : "Kept in queue",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => run("dismiss")}
        disabled={pending}
      >
        <Check className="size-3.5" />
        Dismiss
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => run("hide")}
        disabled={pending}
      >
        <EyeOff className="size-3.5" />
        Hide
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => run("keep")}
        disabled={pending}
        title="Escalate / keep visible for review"
      >
        <X className="size-3.5" />
        Escalate
      </Button>
    </div>
  );
}
