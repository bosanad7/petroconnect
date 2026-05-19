# PetroConnect

> A secure, employee-only marketplace exclusively for verified employees of Kuwait's K-Companies (KPC, KOC, KNPC, KIPIC, PIC, KGOC, KUFPEC, KOTC, KAFCO, Q8).

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn-style primitives**, **Supabase** (auth · Postgres · storage · realtime · RLS), **Framer Motion**, **Recharts**, **Zustand**, and **OpenRouter** for AI features.

---

## 1 · Feature overview

| Area              | Features |
| ----------------- | -------- |
| **Auth**          | Email/password, K-Company domain validation, forgot-password, protected routes |
| **Marketplace**   | Products, services, service requests · search · filters · featured · save/favorite |
| **Listing PDP**   | Image gallery · verified seller card · similar listings · report · contact seller |
| **Messaging**     | Realtime 1:1 chat tied to listings, read/unread, optimistic updates |
| **AI**            | Description generation · category suggestion · smart search · fraud detection · personalised recs |
| **Admin**         | Stats overview · members table · listings table · reports queue |
| **Quality**       | Loading skeletons, empty states, mobile bottom nav, glassmorphism design |

---

## 2 · Project structure

```
petroconnect/
├── app/
│   ├── (auth)/                 # login · register · forgot-password (public)
│   ├── (app)/                  # authenticated app shell
│   │   ├── marketplace/
│   │   ├── services/
│   │   ├── listings/[id]/
│   │   ├── profile/[id]/
│   │   ├── create/
│   │   ├── saved/
│   │   ├── chat/[id]/
│   │   └── admin/
│   ├── api/ai/                 # OpenRouter-powered routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # landing
├── components/
│   ├── ui/                     # button, input, dialog, select, …
│   ├── layout/                 # sidebar, topbar, mobile-nav, logo
│   ├── marketplace/            # listing-card, filter-bar, image-gallery, …
│   ├── chat/                   # conversation-list, chat-room
│   └── admin/                  # analytics-chart, report-actions
├── lib/
│   ├── supabase/               # client.ts, server.ts, middleware.ts, auth.ts
│   ├── ai/openrouter.ts
│   ├── utils/                  # cn, format
│   └── constants.ts            # K_COMPANIES, ALLOWED_DOMAINS, AREAS, …
├── types/database.ts
├── store/                      # zustand
├── supabase/
│   ├── schema.sql              # tables, triggers, FTS, auth hook
│   ├── policies.sql            # RLS for every table + storage buckets
│   └── seed.sql                # default categories
├── middleware.ts               # auth-aware redirects
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3 · Database

The schema is split across three files — run them in order:

| Order | File                                                          | Purpose                                                              |
| ----- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | **[supabase/schema.sql](./supabase/schema.sql)**              | Tables, enums, FTS triggers, `handle_new_user` auth hook             |
| 2     | **[supabase/policies.sql](./supabase/policies.sql)**          | Row-Level Security + storage bucket policies                         |
| 3     | **[supabase/functions.sql](./supabase/functions.sql)**        | RPCs, notification triggers, `conversation_summaries` view, indexes  |
| 4     | **[supabase/ai.sql](./supabase/ai.sql)**                      | `pgvector` extension, embedding column, `match_listings` / `find_similar_listings` / `suggest_price` RPCs |
| 5     | **[supabase/seed.sql](./supabase/seed.sql)**                  | Default product + service categories                                 |

For a single-paste install use **[supabase/migration.sql](./supabase/migration.sql)** — all five files concatenated.

Tables: `profiles · categories · listings · favorites · conversations · conversation_participants · messages · reports · notifications · ai_recommendations`

Highlights:

- **K-Company enum** + auto-detected on signup via the `handle_new_user` trigger
- **Full-text search** on listings (`tsvector` + `gin`), kept in sync by trigger
- **Realtime** enabled for `messages` and `notifications` (turn on in Supabase → Database → Replication)
- **Service-request** listings are first-class via `kind = 'service_request'`
- **AI columns** (`ai_score`, `ai_flags`) on listings for fraud monitoring
- **Auto-notifications** — a DB trigger drops a row into `notifications` when someone messages you or saves your listing. The dropdown subscribes via Realtime.
- **One-query chat list** — the `conversation_summaries` view joins peer + listing + unread count behind RLS so the client doesn't fan out
- **`increment_listing_views(uuid)`** RPC bumps the counter atomically (and skips bumps for the seller's own visits)

Row-Level Security is in `policies.sql` — every table is locked down. Storage buckets `listing-images` and `avatars` are public-read, auth-only-write.

---

## 4 · Local setup

### Prerequisites

- Node.js ≥ 20
- A Supabase project ([supabase.com](https://supabase.com))
- An OpenRouter API key ([openrouter.ai](https://openrouter.ai))

### Steps

```bash
# 1 · Install
cd petroconnect
npm install

# 2 · Configure env
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#         SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY, ADMIN_EMAILS

# 3 · Run database migrations
# Open Supabase → SQL editor and run, in order:
#   supabase/schema.sql
#   supabase/policies.sql
#   supabase/functions.sql
#   supabase/seed.sql

# 4 · Enable realtime
# Supabase → Database → Replication → toggle ON for:
#   public.messages
#   public.notifications

# (Optional) make signups auto-promote chosen emails to admin:
# In Supabase → Database → Settings → Custom Postgres config, set
#   app.admin_emails = 'you@kpc.com.kw,other@knpc.com'

# 5 · Start dev
npm run dev
# → http://localhost:3000
```

### Local-only demo mode

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to bypass Supabase entirely
and explore the UI with mock data (used for stakeholder reviews). Every page
in `app/(app)/*` short-circuits to fixtures in `lib/demo/data.ts`. **Never set
this in production.**

### Auth notes

- Supabase **Email Auth** must be enabled (Settings → Authentication → Providers).
- **Email confirmations** can be turned off for the demo, or pointed at any SMTP provider for production.
- For the verified-only experience, registration only accepts the domains listed in `lib/constants.ts → ALLOWED_DOMAINS` — and the DB trigger refuses to mark non-matching addresses as verified.

### Storage

Run the policies file once — it auto-creates `listing-images` and `avatars` buckets with the correct RLS.

---

## 5 · Environment variables

| Variable                          | Required | Purpose |
| --------------------------------- | -------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | yes      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | yes      | Public anon key (browser & server) |
| `SUPABASE_SERVICE_ROLE_KEY`       | optional | For service-role admin tasks |
| `OPENROUTER_API_KEY`              | yes (AI) | OpenRouter key — `sk-or-…` |
| `OPENROUTER_MODEL`                | no       | Defaults to `openai/gpt-4o-mini` |
| `OPENROUTER_APP_URL`              | no       | Sent as `HTTP-Referer` for OpenRouter analytics |
| `OPENROUTER_APP_NAME`             | no       | Sent as `X-Title` |
| `NEXT_PUBLIC_APP_URL`             | yes      | Public origin (used for OG meta) |
| `ADMIN_EMAILS`                    | no       | Comma-separated list — bootstrap admins |

---

## 6 · AI surface

### Endpoints

| Endpoint                                | Use case |
| --------------------------------------- | -------- |
| `POST /api/ai/generate-title`           | Returns 3 candidate titles from a description (5–10 words each) |
| `POST /api/ai/generate-description`     | Drafts a 110-word marketplace description from a title |
| `POST /api/ai/suggest-category`         | Picks the best slug from our category list |
| `POST /api/ai/suggest-price`            | Returns price percentiles (low/median/high) from semantic neighbours |
| `POST /api/ai/check-duplicate`          | Surfaces near-duplicate listings (fingerprint + cosine similarity) |
| `POST /api/ai/detect-fraud`             | Returns `{ score, flags, rationale }` — feeds admin's "high-risk" panel |
| `POST /api/ai/search`                   | Hybrid semantic + FTS search (reciprocal-rank fusion) |
| `POST /api/ai/smart-search`             | Lightweight FTS-only path (kept for backwards compat) |
| `GET  /api/ai/recommendations`          | Personalised ranked listings, enriched with title/price/images |
| `POST /api/ai/embed-listing`            | Computes + persists the embedding + fingerprint for a single listing |

All routes are server-only, authenticated, rate-limited (`lib/ai/rate-limit.ts`), and use `lib/ai/openrouter.ts` for chat completions / `lib/ai/embed.ts` for vectors.

### Embeddings

- **Model:** `openai/text-embedding-3-small` (1536 dim) via OpenRouter, or directly from OpenAI if `OPENAI_API_KEY` is set
- **Storage:** `public.listings.embedding vector(1536)` with an HNSW index for cosine similarity
- **Backfill:** on every listing publish the create form fires `POST /api/ai/embed-listing` (non-blocking). To backfill existing rows, loop over them and re-call the endpoint.
- **Graceful degradation:** if no provider key is configured the routes return clear "embedding-unavailable" responses and the marketplace falls back to FTS-only.

### Where the AI shows up in the UI

- **Topbar** — `<SmartSearch>` debounced dropdown: as you type, hits the hybrid `/api/ai/search` and shows AI-ranked previews
- **Marketplace** — `<RecommendationsRail>` at the top of the feed
- **Create listing** — AI title button, AI description, AI category, live price suggestion badge, pre-publish duplicate modal, async fraud-score on publish

---

## 7 · Deployment (Vercel)

1. **Push** the `petroconnect/` folder to a Git repository.
2. In Vercel → **Add New Project** → import the repo.
3. **Framework preset** auto-detects Next.js. Leave defaults.
4. Under **Environment Variables**, paste the same keys from `.env.local`.
5. **Deploy**.
6. Back in Supabase → Authentication → URL Configuration, add the Vercel URL to **Site URL** and **Redirect URLs** (`https://your-app.vercel.app/**`).

### Production checklist

- [ ] Run **all four** SQL files against the production Supabase project, in order: `schema.sql` → `policies.sql` → `functions.sql` → `seed.sql`.
- [ ] **`NEXT_PUBLIC_DEMO_MODE` must be unset or `false`** in production env.
- [ ] Lock the `ALLOWED_DOMAINS` list in `lib/constants.ts` to your true approved set.
- [ ] Enable **email confirmation** in Supabase Auth.
- [ ] Turn on **Realtime** for `public.messages` and `public.notifications` (Database → Replication).
- [ ] Set `ADMIN_EMAILS` and re-run the `app.admin_emails` Postgres setting in production.
- [ ] Add a custom domain and HTTPS in Vercel.
- [ ] Rotate the `SUPABASE_SERVICE_ROLE_KEY` and store it only in Vercel's encrypted env.
- [ ] Regenerate the typed DB: `npx supabase gen types typescript --project-id <id> > types/supabase.ts` (replaces the hand-written one).

---

## 8 · Scripts

```bash
npm run dev         # local dev server
npm run build       # production build
npm run start       # serve production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

---

## 9 · Roadmap (post-MVP)

- **Ratings & reviews** between buyer and seller after a deal closes
- **Push notifications** via Supabase + web push
- **Arabic UI** (RTL) — the layout already accounts for `dir="rtl"`
- **Search infra**: swap pg_tsvector for `pg_trgm` + embeddings
- **Verified-by-company** badges per role/seniority
- **Mobile app shell** via Capacitor

---

Made for the people who keep Kuwait running.
