"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface Props {
  listingId: string;
}

export function ListingModerationActions({ listingId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState<"approve" | "reject" | "feature" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function call(action: "approve" | "reject" | "feature" | "unfeature", r?: string | null) {
    setBusy(action === "unfeature" ? "feature" : action);
    const { error } = await supabase.rpc("moderate_listing", {
      p_listing: listingId,
      p_action: action,
      p_reason: r ?? null,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      action === "approve"
        ? "Approved"
        : action === "reject"
        ? "Rejected & removed"
        : action === "feature"
        ? "Featured"
        : "Unfeatured",
    );
    setRejectOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => call("approve")}
          disabled={busy !== null}
        >
          {busy === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRejectOpen(true)}
          disabled={busy !== null}
        >
          <X className="size-3.5" />
          Reject
        </Button>
        <Button
          variant="soft"
          size="sm"
          onClick={() => call("feature")}
          disabled={busy !== null}
        >
          <Sparkles className="size-3.5" />
          Feature
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject listing</DialogTitle>
            <DialogDescription>
              Tell the seller why this was rejected. Logged in the admin audit trail.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Pricing looks unrealistic — please re-list at a fair value."
            rows={4}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => call("reject", reason.trim() || null)}
              disabled={busy !== null}
            >
              {busy === "reject" && <Loader2 className="size-4 animate-spin" />}
              Reject & remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
