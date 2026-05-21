# PetroConnect — Security QA Checklist

This sprint shipped server-side validation, column-level field locks via
Postgres triggers, an admin moderation queue, and an audit log. The
checklist below is a manual proof set you can run end-to-end in
~10 minutes against the live Supabase project.

You need two browser sessions: a normal member account and an admin.

| Account            | Role   |
| ------------------ | ------ |
| `ahmed.alsabah@knpc.com`     | member |
| `fatma.almutairi@kockw.com`  | admin  |

Password for both: `DemoPass2025`.

---

## 1. User cannot create a negative-price listing

1. Sign in as Ahmed
2. Go to `/create`, fill in title + description + select category
3. In the price field, type `-50` and try to publish

✅ **Expected:** server-side rejection with the message
`"price must be between 0 and 100000 KWD"`. No listing row created.

Verify in Supabase SQL editor:
```sql
select id, title, price_kwd, created_at
from public.listings
where seller_id = (select id from public.profiles where email = 'ahmed.alsabah@knpc.com')
order by created_at desc limit 5;
```

---

## 2. User cannot edit another user's listing

1. As Ahmed, find any of Fatma's listings (e.g. the Land Cruiser)
2. In the browser DevTools console, run:
   ```js
   await window.location.assign('/listings/<listing-id>'); // navigate first
   const res = await fetch('https://pmzmzjltzmnirmlieetb.supabase.co/rest/v1/listings?id=eq.<listing-id>', {
     method: 'PATCH',
     headers: {
       apikey: '<anon-key>',
       authorization: `Bearer ${(await window.supabase?.auth.getSession())?.data?.session?.access_token ?? ''}`,
       'content-type': 'application/json',
       prefer: 'return=representation',
     },
     body: JSON.stringify({ price_kwd: 1 }),
   });
   console.log(res.status, await res.text());
   ```

✅ **Expected:** HTTP 403/404. The RLS `listings update own` policy
restricts the update to `auth.uid() = seller_id`, so Ahmed's PATCH is
silently filtered to 0 rows.

---

## 3. User cannot self-elevate to admin or fake verification

1. As Ahmed, open DevTools and try to update his own profile:
   ```sql
   -- equivalent REST PATCH on profiles
   update public.profiles set role = 'admin', is_verified = false where id = auth.uid();
   ```
2. Re-read his profile:
   ```sql
   select role, is_verified from public.profiles where id = auth.uid();
   ```

✅ **Expected:** `role` is still `member`, `is_verified` is still `true`.
The `lock_profile_admin_fields` BEFORE-UPDATE trigger restored both
columns from `OLD`.

---

## 4. User cannot manipulate their own AI fraud score or feature flag

1. As Ahmed, create a normal listing
2. In DevTools, try:
   ```sql
   update public.listings
      set ai_score = 0, is_featured = true, views = 999999
    where id = '<your-new-listing-id>' and seller_id = auth.uid();
   ```
3. Re-read:
   ```sql
   select ai_score, is_featured, views from public.listings where id = '<your-new-listing-id>';
   ```

✅ **Expected:** RLS allows the UPDATE (you own the row), but the
`lock_listing_admin_fields` trigger restores `ai_score`, `is_featured`,
and `views` from `OLD`. The values you sent are silently dropped.

---

## 5. User cannot manipulate payment amount or self-mark as paid

### 5a. Cannot create a payment for a listing they aren't reserved for
1. As Ahmed, find an active listing that's NOT reserved for him
2. Try to call `create_payment` directly:
   ```sql
   select public.create_payment('<some-listing-id>', 'mock');
   ```

✅ **Expected:** Postgres exception `"listing not reserved for you"`.

### 5b. Cannot pass a custom amount
The `create_payment` RPC takes no amount argument — it reads `price_kwd`
from the listing row and computes the fee server-side via `compute_fee()`.
The `payments` table has `"payments admin write"` RLS, so any direct
INSERT from a member is denied.

### 5c. Cannot self-confirm a real-gateway payment
1. As a member, create an offer → seller accepts → `/checkout/...`
2. Pick (a future) real gateway (e.g. Tap), call `/api/payments/confirm`
   with `success: true`

✅ **Expected:** RPC raises `"this provider must be confirmed via webhook"`.
Only mock-provider payments can be self-confirmed during demos; real
gateways must come through `/api/payments/webhook` (service-role).

---

## 6. Rapid-posting and banned-pattern listings go to pending_review

1. As Ahmed, publish 5 listings in quick succession
2. The 6th will be flagged with `rapid_posting` and routed to
   `moderation_status = 'pending_review'`. It's not visible in the
   marketplace until an admin approves it.
3. Try a title like `"Selling laptop - pay via Western Union only"`
4. It should land in pending_review with the `banned_pattern` flag.

Verify in admin:
- Sign in as Fatma → `/admin/moderation/listings`
- The flagged listings appear with their reasons in the queue.
- Click **Approve** → it goes live. Click **Reject** with a reason →
  it's removed, the seller is notified, and the action lands in
  `admin_audit_log`.

---

## 7. Admin audit trail is recorded

After approving / rejecting a few listings as Fatma, run:
```sql
select created_at, action, target_type, target_id, reason
from public.admin_audit_log
order by created_at desc limit 10;
```

✅ **Expected:** one row per admin action, with `admin_id = Fatma's id`,
`target_type = 'listing'`, and the action label (approve / reject /
feature).

---

## Pass / fail summary table for your submission

| #  | Test                                              | Pass / Fail |
| -- | ------------------------------------------------- | ----------- |
| 1  | Negative price refused server-side                |             |
| 2  | Cannot PATCH another user's listing               |             |
| 3  | Cannot self-elevate role or fake verification     |             |
| 4  | Cannot tamper with ai_score / is_featured / views |             |
| 5a | Cannot create payment for unreserved listing      |             |
| 5b | Cannot inject custom payment amount               |             |
| 5c | Cannot self-confirm real-gateway payments         |             |
| 6  | Suspicious listings auto-route to pending_review  |             |
| 7  | Admin actions append to admin_audit_log           |             |
