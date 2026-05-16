# Superlocal — Business Types & Data Model

> Working doc for co-founder review. What we currently capture, how it flows on each side, and what's deliberately deferred.

**Currently shipped:** 7 active business types — Tiffin, Laundry, Tutor/Coaching, PG/Hostel/Flats, Clinic/Doctor, Turf/Sports, Gym/Fitness, plus a generic "Other". Two legacy types (Salon, Repair) exist in code but are no longer pickable on signup.

The rest of this doc has three parts:
1. [Cross-cutting layer](#1-cross-cutting-layer) — what every business shares (identity, customers, shop, bookings, OTP, WhatsApp).
2. [Per-business breakdown](#2-per-business-breakdown) — for each type: who it's for, what we capture, the flows, the differentiators.
3. [Open product questions](#3-open-product-questions) — for our discussion.

---

## 1. Cross-cutting layer

### 1.1 Two roles in one app

| Role | Auth signup route | Profile table | Why it exists |
|---|---|---|---|
| **Provider** (business owner) | `/signup` | `profiles` | Runs the business — adds customers, takes orders, gets paid. |
| **Consumer** (end customer) | `/account/signup` | `consumer_profiles` | Saves their name/phone/email/area once so booking on any provider shop is one tap. |

Both share the same `auth.users` table; a role-aware Postgres trigger creates the right profile row based on `raw_user_meta_data.role`.

### 1.2 Provider profile (the "shop")

Stored in `profiles`. Captured during setup + manageable on `/shop`.

| Field | Why |
|---|---|
| `business_name`, `business_type` | Top-of-app branding + which UI flows to expose |
| `business_settings.services` | Operator's default service list (used in dropdowns) |
| `shop_slug`, `shop_enabled` | Public-facing URL `/s/<slug>` toggle |
| `shop_description`, `shop_contact_phone` | Visible on the public shop page |
| `shop_assets` (jsonb) | Menu PDFs, photos, price lists — uploaded to Supabase Storage |
| `service_areas` (text[]) | Localities served (Kothrud, Baner, Aundh…) |
| `service_radius_km` | Optional radius; used later for proximity matching |
| `location_lat`, `location_lng` | Captured for phase-2 discovery / phase-3 logistics |
| `started_on` | Trust signal on public page ("serving since 2022") |
| `is_verified` | Manual verified flag we can set |
| `whatsapp_templates` (jsonb) | Per-event WhatsApp message templates (see 1.7) |
| `hours` (jsonb) | Operating hours per day (schema in place; UI pending) |

### 1.3 Customer (provider's customer)

Different from `consumer_profiles` — these are the *operator's* customers. Some of them are also Superlocal-signed-up consumers; some aren't (walk-in, phone-only, etc.).

Stored in `customers`. Auto-deduped by `(user_id, phone)`.

**Identity:** name, phone, whatsapp_number, email
**Address:** address, area, city, delivery_instructions
**Relationship:** customer_since, last_order_date, total_orders, total_paid, total_outstanding
**Status:** active / paused / churned / blocked
**CRM:** notes, tags[], referral_source, referred_by

Stats are auto-recomputed by a DB trigger any time an order changes (insert/update/delete). Customer health (`active` / `at_risk` / `churned`) is derived UI-side from `last_order_date`: ≥14 days → at risk, ≥45 days → churned.

### 1.4 Orders (the universal money/event ledger)

Every business module creates a row in `orders` when it produces something billable — even if the operator-facing UI is much richer (e.g., a turf booking, a gym membership, a clinic appointment). This keeps `/orders`, `/payments`, and customer history universal.

Fields: customer_id, customer_name, phone, service, service_details (jsonb), date, status (pending/completed), payment_status (paid/unpaid), amount.

**Why this matters:** the operator can always answer "who owes me money?" by looking at a single screen, regardless of which 7 business types they run.

### 1.5 Services catalog

`services_catalog` — items the operator wants visible on their public shop page.

Fields: name, description, price, duration_minutes, image_url, display_order, active.

Public read (anon role) is allowed only when the parent profile has `shop_enabled = true`. So consumers see a real menu; the operator's private item list is private.

### 1.6 Public bookings inbox

`bookings` — when a consumer fills out the public form at `/s/<slug>/book`, a row lands here.

Fields: customer_name, customer_phone, customer_email, customer_address, customer_area, service_label, service_id (optional FK to catalog), preferred_date, preferred_time, notes, details (jsonb).

**Lifecycle:** pending → accepted (creates a customer row + companion order) / rejected → optionally converted (the operator linked it to a real entity in their domain).

**Linkage:** `consumer_id` (which Superlocal consumer placed it), `customer_id` (which provider-side customer record it became), `order_id` (the companion order).

### 1.7 OTP / confirmation codes (zero-cost)

We do **not** send SMS. We use *provider-shown* / *consumer-shown* 4-digit codes:

- **Public booking** — when a consumer submits the form, we generate a `confirmation_code` and show it to the consumer on the success page + on `/account`. Operator sees it on `/bookings` with a "Verify" input — when the customer reads out the code, the operator types it; status flips to `confirmed_by_owner = true`.
- **Turf arrival code** — generated on booking creation; same UX. When the team reaches the gate they read out the code, owner verifies → status moves to `arrived`.
- **Gym access code** — auto-generated at member creation (4-char alphanumeric, stored on the membership). Member reads it at the door; the [`/gym/checkins`](#27-gym--fitness) panel takes the code, looks up the active member, and inserts a check-in row (DB unique constraint prevents same-day double check-in).

Total telco cost: **₹0**. We may add real SMS for high-fraud surfaces later, but never as the only path.

### 1.8 WhatsApp templates

Every "tap to message" link in the app uses [`wa.me`](https://wa.me) deep links — no API approval, no per-message cost. The body is generated from a template + per-event variables.

Defined in `lib/whatsappTemplates.ts`. Per-business-type defaults baked in (different copy for tiffin vs clinic vs turf). Operator can override on `/shop` — 5 events:

1. Booking received — auto-acknowledge to customer
2. Booking confirmed — when the operator accepts
3. Payment reminder — chase unpaid invoices
4. Order ready — when an order/job is ready
5. Feedback request — after fulfillment

Variables available: `{name}` `{amount}` `{service}` `{date}` `{time}` `{otp}` `{shop}`.

### 1.9 Public shop page (the share-link)

`/s/<slug>` — no auth needed. Renders:
- Hero with business name + icon + description + service-area pills
- Big "Book Now" CTA + WhatsApp deep link
- Services catalog (cards with price + duration + per-item Book → button)
- Photo / menu uploads grid
- For PG specifically: **active room listings** are also publicly readable (so a hostel page browse-able with prices and availability)

The operator gets a copy-able link they paste in their bio / WhatsApp status / Instagram.

---

## 2. Per-business breakdown

For each type below: **what we capture, who fills it, the flows, what's distinctive.**

---

### 2.1 Tiffin / Meal Service

**Operator persona.** Home cooks, dabba-walas, mess kitchens. Daily cadence. Pune student/office worker is the dominant customer.

**Why it's distinctive.** This is a *subscription* business, not per-order. The operator's hardest job is "did I deliver to all 27 customers today?". So the UI revolves around subscriptions + a daily delivery log.

**Schema.** Three tables:

| Table | Captures |
|---|---|
| `tiffin_subscriptions` | One row per subscriber. plan_type (lunch_only / dinner_only / both / custom), meal_preference (veg / nonveg / both), meals_per_day, price_per_meal, monthly_amount, delivery_days[], delivery_slot, delivery_address, status (active/paused/cancelled), pause range, billing_cycle, billing_date, advance_paid, start_date, end_date |
| `tiffin_deliveries` | One row per delivery slot per day. unique on (subscription_id, date, meal_type). delivered (bool), delivery_time, not_delivered_reason. |
| `tiffin_bills` | Monthly bill per subscription. month, year, total_deliveries, amount_due, amount_paid, payment_status (unpaid/partial/paid), payment_mode. |

**Provider flow (today).**
1. Customer onboards (operator adds a subscription via `/tiffin/subscriptions/new`).
2. Each morning, dashboard shows "Today's Deliveries" computed live from active subscriptions whose `delivery_days` includes today's day-of-week.
3. As the operator delivers boxes, they tap the customer's row to log a delivery — auto-creates a `tiffin_deliveries` row.
4. Subscription detail page shows recent 30 deliveries + monthly bills with paid/unpaid chips.

**Consumer flow (today).**
1. Visits `/s/<slug>`, sees menu items (Veg Tiffin ₹80, Non-Veg ₹120…).
2. Taps Book → fills the public booking form (service: "Veg Tiffin", date, notes).
3. Provider receives it on `/bookings` → accepts → currently this creates a generic `orders` row; the provider then has to manually add a `tiffin_subscriptions` entry. **This is rough — the booking → subscription conversion is not yet automated.**

**Open: bill generation.** `tiffin_bills` rows are not auto-generated. Need a monthly cron job (or a "Generate this month's bills" button) that aggregates `tiffin_deliveries` × `price_per_meal`. **Not built.**

---

### 2.2 Laundry / Dry Clean

**Operator persona.** Neighborhood laundry shops doing wash-and-fold, ironing, dry cleaning. Often with home pickup/delivery via a kid on a scooter.

**Why it's distinctive.** Each visit is a "job" with a turnaround promise. Jobs move through a status pipeline: received → in_process → ready → delivered. Some pieces of clothing have issues (stains, missing buttons) that get flagged.

**Schema.**

| Table | Captures |
|---|---|
| `laundry_jobs` | job_number (auto LAU-YYYY-####), pickup_date/time/done, items[] (jsonb: name/qty/service/notes), total_items, weight_kg, price_per_kg, urgency (normal/express_24h/same_day), promised_date, delivery_type (customer_pickup/home_delivery), delivery_address, delivery_charge, status, issue_notes |

**Provider flow.**
1. Customer drops bundle / requests pickup → operator creates a job at `/laundry/jobs/new`.
2. Items entered as a list (3 shirts wash+iron, 2 pants iron, 1 saree dry clean), or weight-based as a fallback.
3. Status pipeline progressed via a "Move to next" button on detail page.
4. Issues (stain, button) → typed into issue_notes → status auto-flips to `issue_raised` for visibility.

**Consumer flow.** No subscription. One-shot: book pickup with approx weight/items + urgency.

**Companion data.** Each job creates an `orders` row so the operator's `/orders` and `/payments` views are universal. Total amount captured at booking time.

---

### 2.3 Tutor / Coaching

**Operator persona.** Private tutors, after-school coaches, exam-prep batches. Both 1-on-1 and group classes.

**Why it's distinctive.** The *paying* person (parent) and the *consumed* person (student) are different. Tutors care about per-student academic context (subjects, weak areas, target exam). Monthly fee tracking is the biggest headache.

**Schema.**

| Table | Captures |
|---|---|
| `students` | name, grade, school, board (CBSE/ICSE/State/IB/IGCSE), subjects[], weak_areas[], target_exam, fee_per_session, sessions_per_week, session_duration_minutes, monthly_fee, fee_due_date, status. **Linked to a `customers` row (the parent).** |
| `tutor_sessions` | session_date, start_time, duration, subject, topic_covered, mode (online/offline/hybrid), attended, absent_reason, session_note, homework_given. |
| `tutor_fees` | Monthly fee record per student: month, year, sessions_scheduled, sessions_attended, amount_due, amount_paid, payment_status, payment_mode. |

**Provider flow.**
1. Add a student → links to / creates a parent `customer` (CustomerPicker).
2. Per session: tap "Log Today's Session" on the student page — captures subject, topic, mode, attended, note, homework.
3. Monthly: tutor sees attendance % and fee status per student.

**Consumer flow.** Currently parent books a trial via the public shop. After accept, operator manually creates a `students` row.

**Open: coaching batch mode.** We added a `mode` field (1-on-1 / Batch / Online) per session, but we don't yet have a *batch object* — i.e., a "Class 10 Maths Batch" with multiple students enrolled. For batch coaching at scale, we'd need a `batches` table and many-to-many `batch_enrollments`. **Deferred** — for v1 we treat each batch student as their own row.

---

### 2.4 PG / Hostel / Flats

**Operator persona.** Boys / girls PG owners, hostel managers, small landlords with student rentals. Listings-driven business.

**Why it's distinctive.** This is a *catalog* business — multiple rooms with different prices/types/availability. Customers don't "subscribe", they request a visit, then sign a lease. So the data shape is **listings + visits + (eventual) tenancies**.

**Schema.**

| Table | Captures |
|---|---|
| `pg_listings` | name, gender (boys/girls/coliving), room_type, monthly_rent, deposit, amenities[], total_beds, beds_available, area, address, rules, meals_included, photos[], active |
| `pg_visits` | listing_id, visitor_name, visitor_phone, visit_date, visit_time, status (requested → confirmed → visited / no_show / converted / rejected), notes |

**Provider flow.**
1. Add room listings — each is publicly browsable on `/s/<slug>` once shop is enabled.
2. Visit request comes in (currently via the generic `bookings` table — see open below).
3. On the listing detail, operator manages visits with status pills + Call/WhatsApp.
4. Decrement `beds_available` (+/− stepper on detail page) when someone moves in.

**Consumer flow.** Visits the public shop, sees rooms with photos+price+gender, taps Book → fills generic booking form.

**Open: visit request entry point.** Currently the public booking form writes to `bookings`, not to `pg_visits`. The PG-specific surface (the listing-page visits tab) only sees visits we manually create. **This is a wiring gap.** The fix is: when a `pg`-business booking is accepted, also create a `pg_visits` row keyed to a chosen listing. Not done yet.

**Open: tenancy / lease tracking.** We track who *visited* but not who *moved in* (lease start, lease end, monthly rent paid). Next step: a `pg_tenancies` table with rent ledger. **Deferred.**

---

### 2.5 Clinic / Doctor

**Operator persona.** GPs, dentists, physiotherapists, micro clinics. Often 1-doctor practices.

**Why it's distinctive.** Appointment-based, time-slot inventory, very personal data (symptoms, diagnosis, prescription). High consequence for missed follow-ups.

**Schema.**

| Table | Captures |
|---|---|
| `clinic_appointments` | appointment_date, start_time, duration_minutes, visit_type (consult / followup / procedure / vaccination / other), mode (in_clinic / tele / home_visit), symptoms (patient's words), diagnosis (doctor's notes), prescription, follow_up_date, fee, payment_status (unpaid/paid), status (confirmed/completed/cancelled/no_show) |

**Provider flow.**
1. Book an appointment for a patient (CustomerPicker).
2. On the day, doctor opens the appointment detail and types diagnosis + prescription. Both autosave on blur.
3. Set follow_up_date if needed — surfaces in customer history.
4. Mark Paid when consult fee is collected.

**Consumer flow.** Public shop → "Consult — ₹300" item → booking form → confirmation_code shown.

**Open: prescription PDF.** Right now prescriptions are free-text. A real product needs a structured medication list, signed PDF generation, and SMS to pharmacy. **Deferred.**

**Open: patient privacy.** All clinic_appointments are RLS-scoped to the owner; consumers can only read their own bookings (not full diagnosis). For HIPAA-style guarantees we'd need additional separation. **For v1 + Indian micro-clinics, current setup is acceptable.**

---

### 2.6 Turf / Sports

**Operator persona.** Box cricket / football turfs, badminton / tennis courts. Time-slot inventory businesses.

**Why it's distinctive.** Time *is* the product. Operators care about preventing double-booking, no-shows, and the "did the team actually arrive" trust gap.

**Schema.**

| Table | Captures |
|---|---|
| `turf_courts` | name, sport, price_per_hour, open_time, close_time, active. (Optional — many operators have just 1 court.) |
| `turf_bookings` | court_id (nullable), booking_date, start_time, end_time, hours, team_size, amount, payment_status (unpaid/partial/paid), advance_paid, **arrival_code** (4-digit), arrived_at, status (confirmed/arrived/completed/cancelled/no_show), notes |

DB unique index prevents two confirmed/arrived/completed bookings overlapping on the same court+date+start_time (when court_id is set).

**Provider flow.**
1. Operator creates a booking — system auto-generates a 4-digit `arrival_code`.
2. Booking detail page displays the code in giant tracked-letter format. Operator can WhatsApp it to the team using the templated message ("show this code at the gate").
3. Team arrives → reads code → operator types it into Verify input → booking flips to `arrived` with timestamp.
4. After play → mark Completed → close payment.

**Consumer flow.** Public shop → pick a service → booking form → confirmation_code on success page (the consumer's view of the same arrival_code path, applied to public bookings).

**Open: visual slot calendar.** Today the slot picker is just date+time fields. A grid view of "today's hours, taken vs free" would be way more useful. **Deferred.**

---

### 2.7 Gym / Fitness

**Operator persona.** Independent gyms, yoga studios, Zumba teachers. Subscription + daily attendance.

**Why it's distinctive.** Same monthly-billing pattern as tiffin (recurring), but with a daily attendance event (check-in) instead of a delivery.

**Schema.**

| Table | Captures |
|---|---|
| `gym_memberships` | plan (monthly / quarterly / yearly / day_pass), start_date, end_date (auto-computed from plan), monthly_fee, trainer, status (active/paused/expired/cancelled), **access_code** (auto-generated 4-char alphanumeric), notes |
| `gym_checkins` | membership_id, checkin_date, checkin_time, method (manual/code/qr), notes. Unique on (membership_id, checkin_date) — **DB-enforced "one check-in per member per day"**. |

**Provider flow.**
1. Add a member → end_date is auto-set based on plan. `access_code` is auto-generated.
2. Per-member detail shows the access code in giant tracked-letter format + a "Check in now" button.
3. **Quick check-in panel** (`/gym/checkins`) — operator types the code at the door, system finds the active member and inserts the check-in. Friendly errors for unknown code / already checked in / paused membership.

**Consumer flow.** No public booking yet. (A customer joining is operator-driven.) **Future:** allow consumers to enroll via the public shop with a "Start trial" CTA.

**Open: class scheduling.** Yoga / Zumba / cross-fit have fixed class times (e.g., 7 AM yoga). We don't yet have a class schedule + attendance per class. Today, attendance is gym-wide, not class-wide. **Deferred.**

---

### 2.8 Other (escape hatch)

Generic business type. No domain table, no specialized fields. Useful for:
- Tailors, flower shops, print shops, stationery stores, dog walkers
- Pilot users whose category we haven't carved out yet (pet groomer, photographer, etc.)

Captures: customer + service name + amount + payment status + free-text notes via `service_details`.

When a category gets ≥10 users on "Other", it's a signal we should add a proper module.

---

### 2.9 Salon / Repair (legacy, dropped)

Both modules exist in the codebase but are no longer pickable on signup. Existing data (if any) still works. We dropped them because they don't fit the **student wedge** (the founder's targeting strategy). They may come back if we expand.

---

## 3. Open product questions

For our discussion. Each is an explicit call we have to make — they're not blocked on implementation, they're blocked on alignment.

### 3.1 Booking → domain entity conversion

When a public booking is accepted, today we just create a generic `orders` row. We don't yet auto-create the *right* domain entity (a tiffin subscription, a PG visit, a gym membership). The operator has to do that manually.

**Options:**
- **A.** On accept, prompt the operator: "Convert to subscription / appointment / job?" with a pre-filled form. *Adds one click, but explicit.*
- **B.** Auto-create the entity based on `business_type` + booking details. *Frictionless but error-prone — what if the booking was actually a one-off?*
- **C.** Keep current behavior; accept just creates a customer + lead. Operator manually creates the entity. *Simplest but most friction.*

**Lean:** A. Worth ~1 day of work. Single most operator-loved feature.

### 3.2 Auto-generation of monthly bills (tiffin, gym, tutor)

Tiffin bills, gym renewals, tutor fees — all monthly. Today, the bill rows are inserted manually (or never). This is the #1 pain for any subscription business.

**Options:**
- **A.** Supabase scheduled function (pg_cron) generates next-month bills on the 1st.
- **B.** "Generate bills" button on operator dashboard.
- **C.** Lazy: bills computed on-the-fly from underlying delivery/checkin/session data; never persisted.

**Lean:** Start with B (manual button), add A once we have ~50 active providers.

### 3.3 Locality model — light or heavy?

Today we have `service_areas` (text[]) on the provider profile. The /browse page (consumer side) hasn't been built yet.

**Options:**
- **A.** Light: locality buckets (Kothrud / Baner / Aundh / …). Operator picks N areas, consumer filters by area. Zero geocoding.
- **B.** Heavy: PostGIS, lat/lng on both sides, distance queries. More accurate but introduces operational complexity (we'd need geocoding for addresses).

**Lean:** A for v1 (~10 providers). Migrate to B in phase 3 when LocoCenter logistics need real distances.

### 3.4 Trust signals on the public shop

Currently the shop page shows business name + description + services + photos. No reviews, no "established date", no "X bookings served", no operating hours.

**Options:**
- **A.** Manual fields: started_on (already in schema), is_verified (we set), operating hours (jsonb already there, no UI yet).
- **B.** Reviews: post-booking 1-tap rating that writes to a `reviews` table. Adds social proof but requires ≥1 booking before it shows.
- **C.** Aggregate from data we already have: "10+ orders this week", "Avg response time: 12 min".

**Lean:** A + C for v1, B in phase 2 once we have enough booking density.

### 3.5 Consumer side: passive profile vs active discovery

Today consumers can sign up at `/account/signup`, save their info, and use it to prefill any booking. But `/account` is just a profile page — no shop discovery.

**Options:**
- **A.** Keep it passive: consumers only land on shops via direct links from operators. (Our P→C wedge.)
- **B.** Build a `/browse` discovery feed that lists shop-enabled providers, filtered by locality + business type.

**Lean:** A first (P→C, fast, what the founder said). Add B in phase 2 when we have enough providers per locality to make discovery non-empty.

### 3.6 Notifications — when do operators check the app?

Today, an operator has to manually open `/bookings` to see new requests. No push, no SMS, no email. For ~10 providers this is OK. At scale it's fatal.

**Options:**
- **A.** Email digest (Supabase SMTP, free).
- **B.** WhatsApp Business API ping (₹0.50/notification, requires template approval).
- **C.** Browser push notifications (free, requires PWA install).

**Lean:** A for v1. C as a nice-to-have. B once we have revenue.

### 3.7 Phase 3 prep: what's the minimum data we need *now* to enable LocoCenter logistics later?

LocoCenter (the founder's moat — shared riders per locality) needs:
- Provider's pickup location (lat/lng)
- Customer's delivery location (lat/lng)
- Delivery window (we have `delivery_slot` for tiffin; ad-hoc elsewhere)

We currently store `location_lat`/`location_lng` on profiles and on consumer_profiles — but we don't capture them yet during signup. **Pre-work for phase 3:** add a "drop a pin" step in signup + booking. Cheap, future-proofs us.

---

## 4. Quick reference — what we are *not* yet doing

To save time arguing about scope:

- **No real SMS** — all OTPs are provider-shown / consumer-shown 4-digit codes. Free, fast enough.
- **No payment collection** — orders are marked paid/unpaid; no UPI / Razorpay integration yet. Operators collect outside the app.
- **No multi-language** — English only. Hindi/Marathi UI is a known gap for tier-2 reach.
- **No multi-staff per provider** — each provider is one auth user. No "barber 1 vs barber 2" distinction inside a salon yet.
- **No reviews / ratings** — pure trust gap, defer to phase 2.
- **No browse / discovery feed** — defer to phase 2.
- **No logistics layer** — phase 3 (LocoCenter).
- **No automated billing for subscriptions** — manual monthly bill creation only.

---

## 5. Cheat sheet — what to show co-founders

The ~5 things I'd put on screen during the discussion:

1. **The schema diagram** — `customers` at center, business-specific tables hanging off (tiffin_subscriptions, pg_listings, etc.), `orders` as the universal money ledger, `bookings` as the public inbox.
2. **The seven business cards** on the setup screen (live demo at `/setup`) — proof we can mass-produce categories quickly.
3. **The OTP flow** for turf and gym — our differentiator. Demo: create a booking, see the code, verify it.
4. **The WhatsApp templates editor on `/shop`** — proof the operator can personalize messages without us touching code.
5. **The public shop link** — the entire P→C funnel in one URL. Forward it on WhatsApp; that's the wedge.
