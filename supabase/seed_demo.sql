-- =====================================================================
-- PetroConnect — Realistic demo seed for investor / stakeholder review.
--
-- Creates 5 verified employees across K-Companies, 14 listings (mix of
-- products + services + 1 service request), favourites, and one active
-- conversation with messages. Safe to re-run (idempotent on email).
--
-- Demo accounts CAN be signed in to:
--   ahmed.alsabah@knpc.com      / DemoPass2025
--   fatma.almutairi@kockw.com   / DemoPass2025
--   yousef.alenezi@kipic.com.kw / DemoPass2025
--   mona.alkhalifa@kpc.com.kw   / DemoPass2025
--   bader.alazmi@pic.com.kw     / DemoPass2025
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Auth users (bcrypt-hashed passwords via pgcrypto)
-- ---------------------------------------------------------------------
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
select
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  email,
  crypt('DemoPass2025', gen_salt('bf')),
  now() - (days_ago || ' days')::interval,
  jsonb_build_object('full_name', full_name),
  '{"provider":"email","providers":["email"]}'::jsonb,
  now() - (days_ago || ' days')::interval,
  now() - (days_ago || ' days')::interval,
  '', '', '', ''
from (values
  ('ahmed.alsabah@knpc.com',      'Ahmed Al-Sabah',     90),
  ('fatma.almutairi@kockw.com',   'Fatma Al-Mutairi',   220),
  ('yousef.alenezi@kipic.com.kw', 'Yousef Al-Enezi',    45),
  ('mona.alkhalifa@kpc.com.kw',   'Mona Al-Khalifa',    160),
  ('bader.alazmi@pic.com.kw',     'Bader Al-Azmi',      30)
) as v(email, full_name, days_ago)
where not exists (select 1 from auth.users u where u.email = v.email);

-- ---------------------------------------------------------------------
-- 2. Enrich the profiles created by the auth trigger
-- ---------------------------------------------------------------------
update public.profiles set
  job_title  = 'Process Engineer',
  department = 'Refining',
  bio        = 'Refining engineer at KNPC Mina Al-Ahmadi. Always around for a coffee.',
  rating_avg = 4.8, rating_count = 7,
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=Ahmed%20AlSabah&backgroundColor=059669'
where email = 'ahmed.alsabah@knpc.com';

update public.profiles set
  job_title  = 'Drilling Supervisor',
  department = 'Drilling',
  bio        = '12 years at Kuwait Oil Company. Upgrading my gear, slowly.',
  rating_avg = 5.0, rating_count = 19,
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=Fatma%20AlMutairi&backgroundColor=db2777'
where email = 'fatma.almutairi@kockw.com';

update public.profiles set
  job_title  = 'Logistics Lead',
  department = 'Logistics',
  bio        = null,
  rating_avg = 4.6, rating_count = 5,
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=Yousef%20AlEnezi&backgroundColor=ea580c'
where email = 'yousef.alenezi@kipic.com.kw';

update public.profiles set
  job_title  = 'Strategic Sourcing Manager',
  department = 'Procurement',
  bio        = 'KPC HQ. Trading mostly office gear and books these days.',
  rating_avg = 4.9, rating_count = 11,
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=Mona%20AlKhalifa&backgroundColor=2563eb'
where email = 'mona.alkhalifa@kpc.com.kw';

update public.profiles set
  job_title  = 'Petrochemical Analyst',
  department = 'Operations',
  bio        = 'New to PIC. Selling things I brought from Doha.',
  rating_avg = 4.7, rating_count = 3,
  avatar_url = 'https://api.dicebear.com/9.x/initials/svg?seed=Bader%20AlAzmi&backgroundColor=7c3aed'
where email = 'bader.alazmi@pic.com.kw';

-- ---------------------------------------------------------------------
-- 3. Listings
--    Inserts only if seller exists AND the same title isn't already
--    present for that seller (so re-running doesn't duplicate).
-- ---------------------------------------------------------------------
insert into public.listings (
  seller_id, kind, title, description, category_id, condition,
  price_kwd, is_negotiable, location, images, status, is_featured, views,
  ai_score, created_at, updated_at
)
select
  p.id,
  L.kind::public.listing_kind,
  L.title,
  L.description,
  (select id from public.categories where slug = L.category_slug),
  L.condition::public.listing_condition,
  L.price_kwd,
  L.is_negotiable,
  L.location,
  string_to_array(L.images_csv, '|'),
  'active'::public.listing_status,
  L.is_featured,
  L.views,
  L.ai_score,
  now() - (L.days_ago || ' days')::interval,
  now() - (L.days_ago || ' days')::interval
from public.profiles p
join (values
  ('fatma.almutairi@kockw.com', 'product', 'Toyota Land Cruiser GXR 2018 — 90,000 km',
   $$Single-owner Land Cruiser GXR in pristine condition. Full service history at Al-Sayer, all original parts, no accidents. Recently fitted with new Yokohama tires and a fresh oil service. Selling because I'm relocating.

Features: leather interior, sunroof, rear entertainment, premium JBL audio. Available for inspection in Salmiya.$$,
   'vehicles', 'good', 8500.000, true, 'Salmiya',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80|https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80|https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
   true, 412, 0.08, 2),

  ('ahmed.alsabah@knpc.com', 'product', 'iPhone 15 Pro Max 256GB — Natural Titanium',
   $$Bought 4 months ago from Xcite. Box, charger, and original receipt included. Always kept in a case with screen protector — looks brand new. Upgrading to the 16 Pro, no other reason for selling. AppleCare+ valid until April 2026.$$,
   'electronics', 'like_new', 320.000, false, 'Hawalli',
   'https://images.unsplash.com/photo-1592286927505-1def25115558?auto=format&fit=crop&w=1200&q=80|https://images.unsplash.com/photo-1695048065329-8c8d4f7c0f97?auto=format&fit=crop&w=1200&q=80',
   true, 287, 0.05, 1),

  ('yousef.alenezi@kipic.com.kw', 'product', 'Herman Miller Aeron Chair — Size B',
   $$Genuine Herman Miller Aeron, size B (medium). 6 years old but in great condition — adjustable lumbar, forward tilt, fully posture-fit. Selling because the office is moving and we got new chairs.$$,
   'furniture', 'good', 180.000, true, 'Ahmadi',
   'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=1200&q=80|https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80',
   false, 91, 0.04, 4),

  ('fatma.almutairi@kockw.com', 'product', 'MacBook Pro 14" M3 Pro · 18GB / 1TB',
   $$M3 Pro chip, 18GB RAM, 1TB SSD. Purchased Jan 2026. Cycle count 38. Used only for light dev work and presentations. Includes original 96W charger.$$,
   'electronics', 'like_new', 580.000, true, 'Kuwait City',
   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80|https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
   true, 198, 0.06, 3),

  ('ahmed.alsabah@knpc.com', 'product', 'MSA V-Gard Safety Helmet (set of 6)',
   $$Six brand new MSA V-Gard safety helmets, unused, still in plastic. Specs: ANSI Z89.1 Type I, Class E. Adjustable Fas-Trac III suspension.$$,
   'industrial', 'new', 65.500, false, 'Ahmadi',
   'https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=1200&q=80',
   false, 44, 0.02, 6),

  ('yousef.alenezi@kipic.com.kw', 'product', 'Samsung 65" QLED Q70C — 2024 Model',
   $$65-inch Samsung QLED, bought less than a year ago. 4K, 120Hz, Quantum HDR, Tizen smart TV. Excellent picture quality, no dead pixels. Comes with original remote and wall mount bracket.$$,
   'home-appliances', 'like_new', 240.000, true, 'Jabriya',
   'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1200&q=80',
   false, 134, 0.07, 8),

  ('fatma.almutairi@kockw.com', 'product', 'Milwaukee M18 FUEL Drill Combo Kit',
   $$M18 FUEL hammer drill + impact driver combo. Comes with 2× 5.0Ah batteries, fast charger, and Milwaukee carry bag. Used for one home renovation project, otherwise stored.$$,
   'tools', 'good', 95.000, true, 'Fahaheel',
   'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=1200&q=80',
   false, 62, 0.03, 11),

  ('ahmed.alsabah@knpc.com', 'product', 'PlayStation 5 + 2 controllers + 3 games',
   $$PS5 disc edition. Excellent condition, lightly used. Includes 2 DualSense controllers (one in midnight black), and 3 games: FIFA 24, GT7, Spider-Man 2. Original packaging included.$$,
   'electronics', 'good', 145.000, true, 'Salwa',
   'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
   false, 221, 0.09, 5),

  ('mona.alkhalifa@kpc.com.kw', 'product', 'Standing desk + monitor arm (Flexispot E7)',
   $$Flexispot E7 frame (electric, dual motor) with 160×80 walnut top. Bought new 18 months ago for 220 KWD. Adding a Loctek dual monitor arm for free. No scratches.$$,
   'furniture', 'good', 95.000, true, 'Mishref',
   'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=1200&q=80',
   false, 73, 0.03, 9),

  ('bader.alazmi@pic.com.kw', 'product', 'DJI Mavic 3 Classic — kit + 3 batteries',
   $$Mavic 3 Classic with the Fly More combo. 3 batteries, charging hub, 4 sets of props, ND filter pack. Less than 4 hours of total flight time. Reason for selling: switching to FPV.$$,
   'electronics', 'like_new', 295.000, true, 'Salmiya',
   'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80',
   true, 156, 0.04, 7),

  ('ahmed.alsabah@knpc.com', 'service', 'AutoCAD & Plant 3D tutoring — weekday evenings',
   $$10 years of refining + petrochemical CAD experience. I offer one-on-one tutoring in AutoCAD, Plant 3D, and Navisworks for engineering students and junior staff preparing for promotion exams. Online or in-person around Hawalli.

Packages: 5 sessions / 10 sessions. First 30-minute consult is free.$$,
   'tutoring', null, 12.000, true, 'Hawalli',
   'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80',
   true, 178, 0.02, 7),

  ('yousef.alenezi@kipic.com.kw', 'service', 'Arabic ↔ English technical translation',
   $$Certified translator with 8 years of experience translating engineering reports, HSE documentation, and audit findings. Specialty: oil & gas terminology, ASME/API standards. Confidentiality guaranteed.$$,
   'translation', null, 0.025, false, 'Kuwait City',
   'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80',
   false, 89, 0.02, 10),

  ('fatma.almutairi@kockw.com', 'service', 'Personal IT helpdesk — home network & smart home',
   $$After-hours IT help for fellow K-Company employees. I will come to your home, set up your router/mesh Wi-Fi, troubleshoot printers, configure smart home devices, and back up your photos. Flat fee per visit.$$,
   'it-services', null, 15.000, true, 'Salmiya',
   'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
   false, 41, 0.03, 13),

  ('ahmed.alsabah@knpc.com', 'service_request', 'Looking for: Process simulation tutor (Aspen Plus)',
   $$Need 4–6 sessions of Aspen Plus tutoring focused on distillation columns and heat exchangers. Preparing for a promotion exam in 6 weeks. Online preferred. Will pay fair rate for the right tutor.$$,
   'technical', null, null, true, 'Online',
   '', false, 17, 0.01, 2)
) as L(seller_email, kind, title, description, category_slug, condition,
       price_kwd, is_negotiable, location, images_csv, is_featured, views,
       ai_score, days_ago)
on p.email = L.seller_email
where not exists (
  select 1 from public.listings x
  where x.seller_id = p.id and x.title = L.title
);

-- ---------------------------------------------------------------------
-- 4. Favourites (Ahmed has saved a few)
-- ---------------------------------------------------------------------
insert into public.favorites (user_id, listing_id, created_at)
select
  p.id,
  l.id,
  now() - (interval '2 days' * row_number() over ())
from public.profiles p
cross join lateral (
  select l.id
  from public.listings l
  join public.profiles seller on seller.id = l.seller_id
  where seller.email <> p.email
    and l.title in (
      'Toyota Land Cruiser GXR 2018 — 90,000 km',
      'MacBook Pro 14" M3 Pro · 18GB / 1TB',
      'Herman Miller Aeron Chair — Size B'
    )
) l
where p.email = 'ahmed.alsabah@knpc.com'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 5. One active conversation (Ahmed ↔ Fatma about the Land Cruiser)
--    Idempotent: only inserts if no existing conversation between this
--    pair on this listing.
-- ---------------------------------------------------------------------
do $seed_conv$
declare
  v_ahmed uuid := (select id from public.profiles where email = 'ahmed.alsabah@knpc.com');
  v_fatma uuid := (select id from public.profiles where email = 'fatma.almutairi@kockw.com');
  v_listing uuid := (select id from public.listings
                     where title = 'Toyota Land Cruiser GXR 2018 — 90,000 km' limit 1);
  v_conv uuid;
begin
  if v_ahmed is null or v_fatma is null or v_listing is null then return; end if;

  select c.id into v_conv
  from public.conversations c
  join public.conversation_participants cp1 on cp1.conversation_id = c.id and cp1.user_id = v_ahmed
  join public.conversation_participants cp2 on cp2.conversation_id = c.id and cp2.user_id = v_fatma
  where c.listing_id = v_listing
  limit 1;

  if v_conv is not null then return; end if;

  insert into public.conversations (listing_id, created_at)
  values (v_listing, now() - interval '2 days')
  returning id into v_conv;

  insert into public.conversation_participants (conversation_id, user_id, last_read_at)
  values (v_conv, v_ahmed, now() - interval '1 day'),
         (v_conv, v_fatma, now());

  insert into public.messages (conversation_id, sender_id, body, created_at) values
    (v_conv, v_ahmed, 'Hi Fatma, is the Land Cruiser still available?', now() - interval '2 days'),
    (v_conv, v_fatma, 'Hi Ahmed — yes it is. When would you like to come see it?', now() - interval '47 hours'),
    (v_conv, v_ahmed, 'Tomorrow evening if possible. Around 5pm?', now() - interval '46 hours'),
    (v_conv, v_fatma, 'Perfect, 5pm works. I''ll send you the address.', now() - interval '1 hour');
end
$seed_conv$;

-- ---------------------------------------------------------------------
-- 6. One open admin report (so the admin queue isn't empty)
-- ---------------------------------------------------------------------
insert into public.reports (reporter_id, listing_id, reason, details, status, created_at)
select
  reporter.id,
  l.id,
  'Suspicious pricing / scam',
  'PS5 price seems too low compared to other listings — wanted a second opinion.',
  'open'::public.report_status,
  now() - interval '1 day'
from public.profiles reporter
join public.listings l on l.title = 'PlayStation 5 + 2 controllers + 3 games'
where reporter.email = 'yousef.alenezi@kipic.com.kw'
  and not exists (
    select 1 from public.reports r
    where r.reporter_id = reporter.id and r.listing_id = l.id
  );

-- ---------------------------------------------------------------------
-- 7. Verify the seed
-- ---------------------------------------------------------------------
select
  (select count(*) from public.profiles)        as profiles,
  (select count(*) from public.listings)        as listings,
  (select count(*) from public.favorites)       as favorites,
  (select count(*) from public.conversations)   as conversations,
  (select count(*) from public.messages)        as messages,
  (select count(*) from public.reports)         as reports;
