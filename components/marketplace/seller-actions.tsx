"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface Props {
  listingId: string;
  listingTitle: string;
  /** If already sold, we show a "Trade completed" pill instead of the button */
  status: "active" | "paused" | "sold" | "removed" | "draft";
  soldTo?: string | null;
}

/**
 * Renders the "Mark as sold" action for the seller. Lets them paste
 * the buyer's email — we resolve it to a profile UUID and call the
 * mark_listing_sold RPC, which atomically flips status and notifies
 * both parties.
 */
export function SellerActions({ listingId, listingTitle, status, soldTo }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "sold" && soldTo) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium">
        <CheckCircle2 className="size-3.5" />
        Trade completed
      </span>
    );
  }

  async function submit() {
    setBusy(true);
    try {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed.includes("@")) {
        toast.error("Enter a full corporate email");
        return;
      }

      // Resolve buyer by email
      const { data: buyer, error: lookupErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", trimmed)
        .maybeSingle();
      if (lookupErr || !buyer) {
        toast.error("No member with that email");
        return;
      }

      const { error } = await supabase.rpc("mark_listing_sold", {
        p_listing: listingId,
        p_buyer: buyer.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Sold to ${buyer.full_name ?? buyer.id}`);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="soft" onClick={() => setOpen(true)}>
        <PackageCheck className="size-4" />
        Mark as sold
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close this trade</DialogTitle>
            <DialogDescription>
              Mark <span className="text-foreground/90 font-medium">{listingTitle}</span> as sold and prompt the buyer for a review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="buyer-email">Buyer's corporate email</Label>
            <Input
              id="buyer-email"
              type="email"
              placeholder="ahmed.alsabah@knpc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              We'll find their account and send them a review prompt.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !email.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Mark sold
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
