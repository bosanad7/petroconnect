import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { chatJSON, AINotConfiguredError } from "@/lib/ai/openrouter";

export const runtime = "nodejs";

const Body = z.object({
  message_id: z.string().uuid(),
  /** When omitted we re-fetch from the DB. */
  body: z.string().min(1).optional(),
});

interface ModerationResult {
  severity: number;             // 0..1
  categories: string[];         // e.g. ["harassment","scam","off-platform"]
  rationale: string;            // short human explanation
}

// Anything ≥ this gets stamped onto the message row.
const FLAG_THRESHOLD = 0.55;

const SYSTEM_PROMPT = `You are a content-safety classifier for chat messages
inside PetroConnect — a private marketplace for verified employees of
Kuwait's oil sector. Messages are between buyers and sellers about
listings.

Score the message for moderation risk. Output strict JSON:
{
  "severity": <number 0..1, where 0 = totally fine and 1 = imminent harm>,
  "categories": [<zero or more short kebab-case tags from this set:
       "harassment", "threats", "explicit", "scam-or-phishing",
       "off-platform-contact", "pii-leak", "spam", "prohibited-item",
       "other">],
  "rationale": "<<= 140 chars, factual and neutral>"
}

Calibration:
- Polite negotiation, normal questions, prices → 0.0–0.15
- Mild rudeness, single profanity, off-topic chatter → 0.15–0.35
- Sharing a phone number / "WhatsApp me at..." → at least 0.55 with
  "off-platform-contact" (Kuwait phone format: 9xx-xxxxx or +965 ...)
- Asking for an OTP, bank PIN, civil ID, password, KNET credentials,
  CVV → 0.85+ with "scam-or-phishing"
- Direct threats, slurs, sexual content → 0.85+
- Spam patterns (mass solicit, repeated links) → 0.6+ with "spam"

Be conservative: only flag things you'd want a human admin to see.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message_id } = parsed.data;

  // Look up the message — also verifies the caller can see it (RLS).
  const { data: msg } = await supabase
    .from("messages")
    .select("id, sender_id, body, conversation_id")
    .eq("id", message_id)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the sender or an admin can run moderation on a message. This
  // prevents anyone in the conversation from re-running moderation
  // repeatedly (which would be a free path to the chat model).
  const body = parsed.data.body ?? (msg as { body: string }).body;
  if ((msg as { sender_id: string }).sender_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let result: ModerationResult;
  try {
    result = await chatJSON<ModerationResult>(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: body.slice(0, 2000) },
      ],
      { temperature: 0.1, max_tokens: 220 },
    );
  } catch (e) {
    if (e instanceof AINotConfiguredError) {
      // Don't fail the chat experience — moderation just turns off.
      return NextResponse.json({ skipped: "ai-not-configured" });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI failed" },
      { status: 500 },
    );
  }

  const severity = Math.max(0, Math.min(1, Number(result.severity) || 0));
  const categories = Array.isArray(result.categories) ? result.categories.slice(0, 6) : [];
  const rationale = typeof result.rationale === "string" ? result.rationale.slice(0, 280) : "";

  if (severity >= FLAG_THRESHOLD) {
    // Use the service role to bypass the message UPDATE-less RLS policy
    try {
      const svc = await createServiceClient();
      await svc
        .from("messages")
        .update({
          flagged_at: new Date().toISOString(),
          moderation_severity: severity,
          moderation_categories: categories,
          moderation_rationale: rationale,
        })
        .eq("id", message_id);
    } catch {
      /* swallow — moderation flag is best-effort */
    }
  }

  return NextResponse.json({
    severity,
    categories,
    rationale,
    flagged: severity >= FLAG_THRESHOLD,
  });
}
