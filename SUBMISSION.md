# PetroConnect — Final Project Submission

**A secure, AI-powered marketplace for verified employees of Kuwait's K-Companies.**
KPC · KOC · KNPC · KIPIC · PIC · KGOC · KUFPEC · KOTC · KAFCO · Q8

---

## 🔗 Access

| | |
| --- | --- |
| **Live platform** | https://petroconnect-virid.vercel.app |
| **Source code** | https://github.com/bosanad7/petroconnect |
| **Author** | Rashed Al-Rashed (Coded Academy final project) |

## 🔐 Test credentials

> Both accounts are pre-seeded demo users. The platform restricts signup to verified K-Company corporate emails, so use these to evaluate.

| Role | Email | Password |
| --- | --- | --- |
| **Member (buyer/seller)** | `ahmed.alsabah@knpc.com` | `DemoPass2025` |
| **Admin** | `fatma.almutairi@kockw.com` | `DemoPass2025` |

Additional demo members: `mona.alkhalifa@kpc.com.kw`, `yousef.alenezi@kipic.com.kw`, `bader.alazmi@pic.com.kw` (same password).

## 🛠 Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Supabase (Postgres + Auth + Realtime + Storage + RLS) · pgvector · OpenRouter AI · Recharts · Vercel.

## ✨ What it does

1. **Closed network** — only verified K-Company corporate-email employees can register. Domain enforced at both UI and database trigger layers.
2. **Marketplace** for products, services, and service-requests with full-text + semantic search.
3. **AI everywhere** — auto-generated titles & descriptions, smart category suggestions, fair-price recommendations, duplicate detection, fraud scoring, and live message moderation.
4. **Realtime chat** with structured offers (Accept / Decline cards), notifications, and read receipts.
5. **Trust System** — 4-tier reputation badges (Newcomer → Trusted → Pro → Elite) computed from rating, completed trades, response speed, and account tenure.
6. **Complete trade loop** — make offer → accept → reserve → checkout → payment → mark-as-sold → post-trade reviews.
7. **Payment workflow** with a provider abstraction (mock works out of the box; MyFatoorah, Tap, KNET ready to plug in).
8. **Admin command center** — Marketplace Health Score, revenue stats, animated charts, payments + transactions tables, AI-flagged-message moderation queue.

## 🧭 Suggested grading flow (≈ 5 min)

1. Open https://petroconnect-virid.vercel.app — read the landing page (animated stats, trust deep-dive).
2. Visit `/trust` to see how verification works.
3. Sign in as **Ahmed** (member): browse the marketplace, open the Land Cruiser listing, press **⌘K** for the global command palette.
4. Click **Message seller** → in the chat, use the **🏷️ tag icon** to send a structured offer of `8000` KWD.
5. Sign out, sign in as **Fatma** (admin): open `/chat`, accept Ahmed's offer.
6. Sign back in as Ahmed: refresh the listing → click **Proceed to payment** → confirm → land on `/payment/success`.
7. Sign in as Fatma again → visit `/admin` to see the Marketplace Health gauge, KPIs, revenue charts, and payment/transaction tables.

## 🔒 Security highlights

- Row-Level Security on every table (anonymous role can read nothing).
- Server-only AI calls (no API keys ever reach the browser).
- Payment webhook endpoint verifies through a service-role bypass with signature checks at the provider boundary.
- AI message moderation flags scam-or-phishing / off-platform-contact / harassment in real time; admin queue at `/admin/moderation`.

## 📊 Database

Tables: `profiles · listings · categories · favorites · conversations · conversation_participants · messages · notifications · reports · payments · transactions · payment_events · platform_fees · reviews · ai_recommendations`.

Run `supabase/migration.sql` (1,785 lines, idempotent) to bootstrap the whole schema in a new Supabase project.

## 📦 Repo layout

```
app/                Next.js App Router pages + API routes
components/         Reusable React components (ui, marketplace, chat, admin, payments)
lib/                Supabase clients, AI providers, payment providers, utils
supabase/           SQL: schema, RLS, AI, trust system, trade loop, payments, moderation
types/              TypeScript domain types
```

---

*Built solo over 4 sprints: MVP foundation → AI integration → trust + trade loop → payments + admin analytics + moderation.*
