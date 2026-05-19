# PetroConnect — Post-MVP Roadmap

> A staged plan for what comes after demo day. Each phase is ~1 sprint
> (1–2 weeks) for a small team. Items are ordered roughly by ROI per week.

---

## Current state (shipped in the MVP)

- ✅ Verified-only auth (corporate-email gate + DB-enforced verification)
- ✅ Marketplace + services + service-requests with FTS
- ✅ Realtime chat, notifications (with DB triggers), favourites
- ✅ Admin dashboard: members, listings, reports, analytics
- ✅ Image uploads with RLS-gated storage
- ✅ Full AI surface — title, description, category, fraud, search, recommendations, price-suggest, dedupe, embeddings
- ✅ Onboarding modal, trust page, animated stats
- ✅ Production-grade RLS on every table

---

## Phase 1 — Trust & Trade Loop (week 1–2)

The MVP can list and chat. Phase 1 closes the loop into a completed trade.

### Ratings & reviews
- After a conversation is marked "sold", buyer + seller can each leave a 1–5 star rating and short text review.
- New `reviews` table with FK to `listings` and both `profiles`.
- Re-compute `profiles.rating_avg` / `rating_count` via a DB trigger (already wired in schema).
- Block a member from reviewing the same trade twice.

### Mark as sold / reserved
- Seller-only buttons on the listing detail page.
- Status transitions: `active → reserved (with buyer_id) → sold`.
- Sold listings stay browsable on profiles but greyed out in the marketplace.

### In-app price negotiation
- Buyer can send a structured "offer" in chat — appears as a card with accept/counter buttons.
- Accepting marks the listing reserved.

### Phone-share opt-in
- Members can choose to expose their phone in their profile after a trade is initiated.
- Defaults to off; stored in `profiles.phone` with RLS that only reveals it to participants of an active conversation.

---

## Phase 2 — Localisation & Reach (week 3–4)

### Arabic UI (RTL)
- Add `next-intl` (or `next-international`) and translate all strings.
- Layouts already account for `dir="rtl"`; sweep components for hard-coded left/right margins.
- Add Arabic versions of marketing copy on landing + trust pages.

### Push notifications
- Web push via service worker + `web-push` library.
- Notification types: new message, listing favourited, report status changed.
- Mobile-only "Add to Home Screen" prompt with PWA manifest.

### Mobile bottom-sheet UX
- Filters, image gallery, and create-listing become bottom sheets on small screens.
- Pure CSS via Radix-UI primitives — no separate code path.

---

## Phase 3 — Search & Discovery (week 5–6)

### Vector backfill at scale
- Backfill embeddings for the full listing corpus in a single background job.
- Re-rank `match_listings` with category and recency boosts.

### Saved searches + alerts
- Save any query+filter combo with a name.
- Daily digest email when new matches appear (via Resend or Supabase Edge Function with cron).

### Browse by company
- New tab on the marketplace: "From KPC / KOC / KNPC / …"
- Filter the FTS + semantic query by `seller.company`.

### Personalised home feed
- Rank candidates with: recency × semantic similarity to recently-favourited × seller-quality (rating).
- Replace the static "Recommended for you" rail with this on the marketplace home.

---

## Phase 4 — Trust 2.0 + Payments (week 7–10)

### Optional escrow via KNET / MyFatoorah
- Add a "Pay through PetroConnect" option for listings ≥ 100 KWD.
- Funds held until both parties confirm handoff.
- Integration via MyFatoorah (popular in Kuwait) or KNET PG.
- New `transactions` table.

### Verified ID step-up
- For listings ≥ 1000 KWD, require a one-time civil-ID upload (encrypted at rest, reviewed by admin).
- Sellers with a higher verification tier get a different badge ("ID-verified").

### SSO via company SAML / OIDC
- Replace email/password with company SSO for K-Companies that opt in.
- Removes the password vector entirely.

### Anti-shilling
- Detect mutual-rating rings between two accounts.
- Block reviews until the conversation has ≥ 5 messages over ≥ 24 hours.

---

## Phase 5 — Platform & Mobile (week 11–14)

### Native apps via Capacitor
- Wrap the existing Next.js app into iOS + Android shells.
- Native camera/upload via Capacitor plugins.
- Distribute via TestFlight + Play Internal first.

### Public REST + webhooks
- Read-only public API (with rate limits) for K-Company HR systems to pull aggregate metrics.
- Outbound webhooks for: new listing, new report, new sale.

### Multi-region replication
- Add a Bahrain read-replica via Supabase replication.
- Switch Next.js fetches to region-aware routing.

---

## Known weak points (call these out honestly in investor Q&A)

1. **Embedding backfill** — only listings created after pgvector setup have embeddings. New deployments need a one-time backfill job for existing listings.
2. **Email confirmation off** in current Supabase config. Turn it on + wire SMTP before public launch.
3. **No KYC for sellers of high-value items** — a seller could in theory misrepresent ownership of an expensive item. Phase 4 escrow + ID step-up addresses this.
4. **Single-region Postgres** — Frankfurt has 80–120ms latency from Kuwait. Move to Bahrain region or add a read replica.
5. **No transactional integrity for trades** — once-only "mark as sold" exists in Phase 1; real fund flow needs Phase 4.
6. **AI rate-limiter is in-memory** (`lib/ai/rate-limit.ts`). On Vercel each instance gets its own bucket. Swap for Upstash Redis before scale.
7. **Storage quota** — Supabase free tier is 1GB. At ~100KB per listing image × 8 images, that's ~1250 listings. Plan to upgrade or switch to a CDN bucket early.
8. **No image moderation** — we run AI fraud-detection on text but not images. NSFW / inappropriate photos slip through until reported. Phase 2 should add Rekognition or moondream-style image checks.

---

## Metrics to track from day one

- **D7 / D30 retention** of newly-signed-up members
- **Time-to-first-listing** (target: < 24h for ≥ 60% of new accounts)
- **Conversation → completed-trade conversion** (the hardest funnel step)
- **Listings per active member per month**
- **Reports per 1k listings** — should trend down as AI guardrails improve
- **Realtime channel concurrency** — when it hits 200, plan a Supabase upgrade

---

## What to keep cutting

These are nice-to-haves the MVP shipped without. **Don't add them back unless members ask:**

- "Following" other members (it's a marketplace, not a social network)
- Public feeds / activity walls
- Tags / hashtags on listings
- A reactions system on messages
- Profile vanity URLs / handles
- Verified-by-role badges ("Senior Engineer") — too easy to game
