"use client";

import { useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatKWD } from "@/lib/utils/format";

interface Props {
  conversationId: string;
  senderId: string;
  listingAsk?: number | null;
}

export function OfferDialog({ conversationId, senderId, listingAsk }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter an amount in KWD");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      kind: "offer",
      body: `Offer: ${formatKWD(n)}`,
      data: { amount: n, currency: "KWD" },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Make offer"
          title="Make a structured offer"
        >
          <Tag className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription>
            The seller will see a card with Accept and Decline buttons.
            {listingAsk != null && (
              <>
                {" "}Asking price:{" "}
                <span className="text-foreground font-medium">
                  {formatKWD(listingAsk)}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (KWD)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            placeholder="e.g. 7500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy || !amount}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Send offer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
