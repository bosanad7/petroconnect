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

The schema is in **[supabase/schema.sql](./supabase/schema.sql)** with these tables:

`profiles · categories · listings · favorites · conversations · conversation_participants · messages · reports · notifications · ai_recommendations`

Highlights:

- **K-Company enum** + auto-detected on signup via the `handle_new_user` trigger
- **Listings full-text search** via `tsvector` + `gin` index — fed automatically by trigger
- **Realtime-ready** for `messages` and `conversations`
- **Service-request** listings are first-class via `kind = 'service_request'`
- **AI columns** (`ai_score`, `ai_flags`) on listings for fraud monitoring

Row-Level Security is in **[supabase/policies.sql](./supabase/policies.sql)** — every table is locked down. Storage buckets `listing-images` and `avatars` are public-read, auth-only-write.

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
#   supabase/seed.sql

# (Optional) make signups auto-promote chosen emails to admin:
# In Supabase → Database → Settings → Custom Postgres config, set
#   app.admin_emails = 'you@kpc.com.kw,other@knpc.com'

# 4 · Start dev
npm run dev
# → http://localhost:3000
```

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

| Endpoint                                | Use case |
| --------------------------------------- | -------- |
| `POST /api/ai/generate-description`     | Drafts a 110-word marketplace description from a title |
| `POST /api/ai/suggest-category`         | Picks the best slug from our category list |
| `POST /api/ai/detect-fraud`             | Returns `{ score, flags, rationale }` — feeds admin's "high-risk" panel |
| `POST /api/ai/smart-search`             | Rewrites fuzzy queries → keyword vector → FTS results |
| `GET  /api/ai/recommendations`          | Personalised ranked listings for the home feed |

All routes are server-only, authenticated, and use `lib/ai/openrouter.ts` with strict JSON output where appropriate.

---

## 7 · Deployment (Vercel)

1. **Push** the `petroconnect/` folder to a Git repository.
2. In Vercel → **Add New Project** → import the repo.
3. **Framework preset** auto-detects Next.js. Leave defaults.
4. Under **Environment Variables**, paste the same keys from `.env.local`.
5. **Deploy**.
6. Back in Supabase → Authentication → URL Configuration, add the Vercel URL to **Site URL** and **Redirect URLs** (`https://your-app.vercel.app/**`).

### Production checklist

- [ ] Run `schema.sql`, `policies.sql`, `seed.sql` against the **production** Supabase project.
- [ ] Lock the `ALLOWED_DOMAINS` list in `lib/constants.ts` to your true approved set.
- [ ] Enable **email confirmation** in Supabase Auth.
- [ ] Turn on **Realtime** for the `messages` and `conversations` tables (Database → Replication).
- [ ] Set `ADMIN_EMAILS` and re-run the `app.admin_emails` Postgres setting in production.
- [ ] Add a custom domain and HTTPS in Vercel.
- [ ] Rotate the `SUPABASE_SERVICE_ROLE_KEY` and store it only in Vercel's encrypted env.

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
