# Superlocal — Handoff Doc

A new dev / cofounder picking this up should be able to read just this file and be productive within an hour. It's long but flat — skim the index, dive into the sections you need.

**Index**
1. [What this is](#1-what-this-is)
2. [Status snapshot](#2-status-snapshot)
3. [Tech stack & why](#3-tech-stack--why)
4. [Local development](#4-local-development)
5. [Repository tour](#5-repository-tour)
6. [Database schema & migrations](#6-database-schema--migrations)
7. [The 11 business types](#7-the-11-business-types)
8. [Cross-cutting features](#8-cross-cutting-features)
9. [Deployment runbook](#9-deployment-runbook)
10. [Scaling & capacity](#10-scaling--capacity)
11. [Conventions, patterns & gotchas](#11-conventions-patterns--gotchas)
12. [Phase 2 backlog](#12-phase-2-backlog)
13. [How decisions got made](#13-how-decisions-got-made)

---

## 1. What this is

**Superlocal** is a two-sided MVP serving small Indian local-service providers and their customers. The thesis: every kirana / tiffin / clinic / coaching class / gym in India runs operations on WhatsApp + paper. We give them a lightweight web app that:

- Tracks orders, customers, payments
- Generates a public shop link (`/s/<slug>`) for customers to book directly
- Sends WhatsApp receipts that double as a viral signup CTA for the consumer side
- Surfaces "what needs doing today" on a single dashboard

Consumer side: lightweight account that prefills booking forms across providers + tracks past receipts. Currently driven mostly via shop links and receipt CTAs; a true `/browse` discovery page is Phase 2.

**Live**: https://superlocalind.vercel.app
**Repo**: https://github.com/smileplis/superlocal (private, owner: `smileplis`)

---

## 2. Status snapshot

### Shipped

**Foundation**
- Provider auth (Supabase Auth, email/password) + setup flow + business-type selector
- Consumer auth (`/account/...`) using the same auth.users table but role-aware via `raw_user_meta_data.role`
- 10 business types live: `tiffin`, `laundry`, `tutor`, `pg`, `clinic`, `turf`, `gym`, `retail`, `rentals`, `service` (+ `other` fallback)
- Customer/CRM layer shared across all business types
- Universal `/r/<token>` receipt page with print/PDF + WhatsApp share + viral consumer-signup CTA
- WhatsApp template system with per-business defaults + customisable overrides
- Onboarding checklist on dashboard
- PostHog analytics with `$autocapture` + ~15 custom events
- Cloudinary image pipeline for shop / product / rental photos
- QR poster (`/shop/qr`) for every shop, with print + PNG download + WA share

**Provider-side operational surfaces**
- Per-business dashboard widgets on `/dashboard`
- Per-business `/today` pages (tiffin, tutor, laundry, clinic, turf) with one-tap actions
- Retail: POS, products list with quick-add + CSV import (upsert mode), sales history, khata (udhaar) ledger
- Rentals: items list, new-rental form, detail with return-flow (late fee + damage charge + settlement)
- Bookings inbox with structured-details renderer per business type

**Consumer-side**
- Public shop page `/s/<slug>` adapts per business type:
  - Service-style (tiffin/laundry/tutor/clinic/turf/gym/pg/service) → Menu/Catalogue + booking form
  - Retail → product Catalogue with cart → WhatsApp order
  - Rentals → "What we rent" + date-aware request sheet
- Per-business booking forms with appropriate fields + slot pickers:
  - Tiffin subscribe (plan / preference / days)
  - Clinic slot picker (date carousel + 30-min slot grid, busy slots greyed via RPC)
  - Turf court + hourly grid (multi-hour contiguous selection)
  - Tutor enrolment (grade, board, subjects multi-add)
  - Laundry pickup request (urgency, items, pickup window)
  - Generic booking form for service/pg/gym

### In-flight / not yet built

See [PHASE_2_ROADMAP.md](PHASE_2_ROADMAP.md) for per-module Tier A/B/C lists. Highest-priority opens:

1. **Caching unlocks** — middleware early-exit on public paths, drop `force-dynamic` on `/s/[slug]` and `/r/[token]`. ~Half a day, free, ~3× capacity unlock.
2. **PG module deep-dive** — no Today page yet, basic public visit form, no occupancy view, no tenant tracking.
3. **Gym module deep-dive** — needs expiring-membership WA reminders, public trial signup CTA, class scheduling.
4. **Auto monthly bills** — `tiffin_bills` and `tutor_fees` are currently manual rows; we need a month-end roll-up button (and later a cron).
5. **Booking → entity conversion** — when a tiffin subscription request is accepted, auto-create the `tiffin_subscriptions` row prefilled from `bookings.details`.
6. **Consumer `/browse`** — locality + type filter so consumers can discover shops, not just open direct links.

---

## 3. Tech stack & why

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router | Best-in-class SSR + Server Components + edge-ready. Bundled file-based routing. Vercel native. |
| Hosting | Vercel | Zero-config Next deploys, generous free tier, instant previews, included CDN |
| DB + Auth + Storage | Supabase | Postgres (not a NoSQL toy), RLS for free auth-aware queries, all-in-one with auth, hosted, generous free tier |
| Public images | Cloudinary | 25 GB/mo egress free, auto WebP/AVIF, direct browser upload (no Vercel function in the middle). Frees Supabase egress for DB queries. |
| Analytics | PostHog | Free tier + autocapture + session recording + feature flags. Self-hostable later. |
| Styling | Tailwind v3 | Speed of iteration + matches Vercel/Next ecosystem |
| Icons | lucide-react | Coherent set, tree-shakes well, no emoji issues across platforms |
| Messaging | wa.me deep links | Zero ops cost (no WA Business API), zero approval process. Customer's own WhatsApp does the work. |

**What we explicitly didn't pick:**
- Prisma → directly using Supabase typegen is simpler at our scale.
- Clerk/Auth.js → Supabase Auth is already there, no reason to add a second auth provider.
- Stripe/Razorpay (yet) → most providers run on cash/UPI/credit notes; we punt online payment to Phase 2.
- A separate state manager → Server Components + URL state cover 95% of needs. Local `useState` for the rest.

---

## 4. Local development

### Setup

```bash
git clone git@github.com:smileplis/superlocal.git
cd superlocal
npm install
cp .env.example .env.local   # if .env.example exists; otherwise create .env.local
```

Required `.env.local` (ask the owner for actual values):
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # optional, defaults to US
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<preset>
```

```bash
npm run dev   # http://localhost:3000
```

### Type-check / build

```bash
npm run lint
npm run build
```

If the env vars aren't set, `next build` will fail at the Supabase client init. Use stubs for type-checking only:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=stub npx next build
```

### Database migrations

There are no automated migrations — schema lives in `supabase/schema*.sql` files and is applied manually via Supabase's SQL editor when seeding a new project. Run them in order:

```
schema.sql              ← V1: profiles + orders + RLS
schema-v2.sql           ← V2: customers + business-specific tables (tiffin/laundry/tutor/salon/repair)
schema-v3.sql           ← V3: shop fields, services_catalog, bookings, storage
schema-v4.sql           ← V4: consumer_profiles, bookings.consumer_id
schema-v5.sql           ← V5: PG, clinic, turf, gym + service_areas + WA templates + OTP codes
schema-v6.sql           ← V6: profiles.owner_name + owner_phone + role-aware handle_new_user trigger
schema-v7.sql           ← V7: retail (products/sales/sale_items), rentals (rental_items/rentals), universal receipts, events
schema-v7.1-hotfix.sql  ← bookings_public_insert RLS relax (shop_enabled OR setup_complete)
schema-v8.sql           ← V8: products_public_read + customer_credit view (khata)
schema-v9.sql           ← V9: rental_items_public_read + late_fee + damage_charge + return_notes + id_proof_note
schema-v10.sql          ← V10: get_clinic_busy_slots RPC for public slot picker
schema-v10.1-hotfix.sql ← products partial-index → plain unique index (CSV upsert fix)
```

Each is idempotent — safe to re-run.

---

## 5. Repository tour

```
src/
├── app/
│   ├── (app)/                              # AUTH-GATED provider routes (RLS-enforced)
│   │   ├── layout.tsx                       # auth check + Navigation + TemplatesProvider mount
│   │   ├── dashboard/                       # home page widgets per business type
│   │   │   ├── page.tsx                     # branches on profile.business_type
│   │   │   ├── TiffinDashboard.tsx
│   │   │   ├── LaundryDashboard.tsx
│   │   │   ├── ... (one per business)
│   │   │   ├── RetailDashboard.tsx
│   │   │   ├── RentalsDashboard.tsx
│   │   │   ├── ServiceDashboard.tsx
│   │   │   ├── OnboardingChecklist.tsx
│   │   │   └── TodaysDeliveriesList.tsx     # legacy tiffin checklist (still embedded in dashboard)
│   │   ├── tiffin/
│   │   │   ├── subscriptions/{page,new,[id]}
│   │   │   └── today/{page,TiffinTodayClient}
│   │   ├── tutor/students/{page,new,[id]}
│   │   ├── tutor/today/{page,TutorTodayClient}
│   │   ├── laundry/jobs/{page,new,[id]}
│   │   ├── laundry/today/{page,LaundryTodayClient}
│   │   ├── clinic/appointments/{page,new,[id]}
│   │   ├── clinic/today/{page,ClinicTodayClient}
│   │   ├── turf/bookings/{page,new,[id]}
│   │   ├── turf/today/{page,TurfTodayClient}
│   │   ├── gym/members/{page,new,[id]} + checkins
│   │   ├── pg/listings/{page,new,[id]}
│   │   ├── retail/
│   │   │   ├── page.tsx                     # tiles home
│   │   │   ├── pos/{page,PosClient}
│   │   │   ├── products/{page,ProductsClient,ProductForm,new,[id],import}
│   │   │   ├── sales/{page,[id]}
│   │   │   └── khata/{page,KhataList}
│   │   ├── rentals/
│   │   │   ├── page.tsx                     # bookings list
│   │   │   ├── new/{page,RentalForm}
│   │   │   ├── [id]/{page,RentalDetailActions}
│   │   │   └── items/{page,ItemsClient,RentalItemForm,new,[id]}
│   │   ├── orders/{page,new}
│   │   ├── customers/{page,[id]}
│   │   ├── payments/page
│   │   ├── bookings/{page,BookingsList}     # inbox + StructuredDetails renderer
│   │   └── shop/
│   │       ├── page.tsx                     # shop settings page (services hidden for retail/rentals)
│   │       ├── ShopSettings.tsx
│   │       ├── ServicesEditor.tsx
│   │       ├── AssetUploader.tsx            # now uses Cloudinary
│   │       ├── WhatsAppTemplates.tsx
│   │       └── qr/{page,BannerClient}        # QR poster generator
│   ├── account/                             # CONSUMER auth + dashboard
│   │   ├── layout.tsx
│   │   ├── login/{page,LoginForm}
│   │   ├── signup/{page,SignupForm}         # ?ref=<token> attributes signup to a provider
│   │   ├── ProfileEditor.tsx
│   │   ├── SignOutButton.tsx
│   │   ├── _lib.ts
│   │   └── page.tsx
│   ├── s/[slug]/                            # PUBLIC shop pages (no auth required)
│   │   ├── page.tsx                         # branches: RetailCatalogue / RentalCatalogue / generic
│   │   ├── RetailCatalogue.tsx              # client cart, WhatsApp order
│   │   ├── RentalCatalogue.tsx              # date picker, WhatsApp request
│   │   └── book/
│   │       ├── page.tsx                     # branches on business_type → right form
│   │       ├── BookingForm.tsx              # generic fallback
│   │       ├── success/page                 # post-booking thank-you with confirmation code
│   │       └── forms/
│   │           ├── shared.tsx               # SignedInBadge, CustomerDetailsBlock, ErrorBox
│   │           ├── TiffinSubscribeForm.tsx
│   │           ├── ClinicAppointmentForm.tsx
│   │           ├── TurfBookingForm.tsx
│   │           ├── TutorEnrolForm.tsx
│   │           └── LaundryPickupForm.tsx
│   ├── r/[token]/                           # PUBLIC universal receipt
│   │   ├── page.tsx                         # RPC call → render receipt + viral signup CTA
│   │   └── PrintButton.tsx
│   ├── login/{page,LoginForm}               # provider login
│   ├── signup/{page,SignupForm}             # provider signup
│   ├── setup/{page,SetupFlow}               # business-type selector + first-setup
│   ├── auth/                                # supabase auth callback
│   ├── layout.tsx                           # root layout — PostHogProvider mount
│   ├── globals.css                          # Tailwind base + brand vars
│   └── page.tsx                             # / — redirects to /dashboard or /login
├── components/
│   ├── Navigation.tsx                       # bottom nav (provider), business-aware middle tab
│   ├── OrderCard.tsx                        # universal order display
│   ├── CustomerPicker.tsx                   # phone-debounced lookup + resolveCustomer helper
│   ├── StatusBadge.tsx
│   ├── TemplatesProvider.tsx                # React context for WA templates, exposes useWhatsAppMessage + useWhatsAppFiller
│   ├── PostHogProvider.tsx                  # root SDK init + SPA pageview tracking
│   ├── PostHogIdentify.tsx                  # called in auth layouts to identify the user
│   ├── CloudinaryUploader.tsx               # single + multi-file upload component
│   └── CloudinaryImage.tsx                  # transform-injecting <img> replacement
├── lib/
│   ├── businessTypes.ts                     # canonical list of supported business types
│   ├── businessRoutes.ts                    # type → primary route + label + Icon
│   ├── placeholders.ts                      # per-type placeholder strings for forms
│   ├── types.ts                             # all DB row types (Order, Customer, Product, etc.)
│   ├── utils.ts                             # formatINR, whatsappLink, todayISO, generateOtp
│   ├── otp.ts                               # 4-digit OTP generator
│   ├── whatsappTemplates.ts                 # per-business defaults + applyTemplate + getTemplatesForBusiness
│   ├── cloudinary.ts                        # uploadToCloudinary, cloudinaryUrl, isCloudinaryUrl
│   ├── supabase/
│   │   ├── client.ts                        # browser client (used in 'use client' components)
│   │   ├── server.ts                        # server client (reads cookies)
│   │   └── middleware.ts                    # middleware client (refreshes session, gates routes)
│   └── posthog/
│       └── client.ts                        # init, identify, track, captureException helpers
├── middleware.ts                            # auth gate: redirects unauth users from /(app)/* to /login
supabase/
└── schema*.sql                              # migrations in numbered order
docs/
├── HANDOFF.md                               # THIS FILE
├── PHASE_2_ROADMAP.md                       # per-module Tier A/B/C backlog
├── CLOUDINARY_SETUP.md                      # how to wire Cloudinary
├── BUSINESS_TYPES.md                        # co-founder doc on each business type
└── APP_OVERVIEW.md                          # earlier overview doc
CLAUDE.md                                    # lean context file for Claude Code agents
```

---

## 6. Database schema & migrations

### Core entity model

```
auth.users (Supabase-managed)
   │
   ├── profiles (1:1)              ← providers
   │     - business_type
   │     - business_subkind        ← retail/rentals/service variant (V7)
   │     - shop_slug, shop_enabled
   │     - shop_assets jsonb       ← gallery of uploaded media
   │     - whatsapp_templates jsonb
   │     - service_areas[]
   │     - hours jsonb
   │
   └── consumer_profiles (1:1)     ← end customers
         - referred_by_user_id     ← receipt attribution (V7)

profiles (1)
   │
   ├── customers (M)                ← provider's customer book
   │     - status, last_order_date, total_outstanding (autoupdated by triggers)
   │     - tags[], notes, referral_source
   │
   └── orders (M)                  ← universal "service order" ledger
         - service_details jsonb

customers (1)
   │
   ├── tiffin_subscriptions (M) → tiffin_deliveries (M) → tiffin_bills (M)
   ├── laundry_jobs (M)
   ├── students (M) → tutor_sessions (M) → tutor_fees (M)
   ├── clinic_appointments (M)
   ├── turf_bookings (M)              ← unique (court_id, date, start_time)
   ├── gym_memberships (M) → gym_checkins (M)
   ├── pg_visits (M) → pg_listings (M)
   ├── sales (M) → sale_items (M)     ← retail (V7)
   └── rentals (M) → rental_items (M) ← rentals (V7)

profiles (1)
   ├── products (M)                ← retail catalogue (V7)
   ├── rental_items (M)            ← rentals catalogue (V7)
   ├── services_catalog (M)        ← service-style catalogue
   ├── receipts (M)                ← universal receipts via token (V7)
   ├── bookings (M)                ← public-shop submitted requests
   └── events (M)                  ← server-side analytics safety net
```

### RLS policies

- **Owner-only by default**: every business table has a `<table>_owner_all` policy that gates SELECT/INSERT/UPDATE/DELETE on `auth.uid() = user_id`.
- **Public read for catalogue tables**: `products_public_read`, `rental_items_public_read`, `services_catalog`-via-shop, `turf_courts_public_read`, `turf_bookings_public_read_slots`, `pg_listings_public_read`. All gated by the provider's `shop_enabled = true`.
- **Public insert for bookings**: `bookings_public_insert` — anon + authenticated can submit a booking to any provider that has `shop_enabled = true` OR `setup_complete = true` (relaxed in v7.1 hotfix).
- **Security-definer RPCs** for narrow public reads that would otherwise leak data: `get_receipt_by_token` (V7), `get_clinic_busy_slots` (V10). Both granted to `anon, authenticated`.

### Triggers worth knowing about

| Trigger | What it does |
|---|---|
| `handle_new_user` (auth.users) | Routes new signups to `profiles` (owner) or `consumer_profiles` (consumer) based on `raw_user_meta_data.role` |
| `trg_orders_touch_customer` | Recomputes `customers.total_orders, total_paid, total_outstanding, last_order_date` on every orders insert/update/delete |
| `trg_sale_items_decrement_stock` | Auto-decrements `products.stock` when a `sale_items` row is inserted |
| `trg_rentals_availability` | Adjusts `rental_items.available_qty` when a rental's status flips between active and inactive states |

---

## 7. The 11 business types

Each business type is declared in [src/lib/businessTypes.ts](../src/lib/businessTypes.ts) with an icon, default services, and form fields. Adding a new type requires also updating `businessRoutes.ts`, `placeholders.ts`, `whatsappTemplates.ts`, and the `/s/[slug]` page branching.

### Tiffin / Meal service

- **Tables**: `tiffin_subscriptions`, `tiffin_deliveries`, `tiffin_bills`
- **Provider routes**: `/tiffin/subscriptions` (list), `/tiffin/subscriptions/new`, `/tiffin/subscriptions/[id]`, **`/tiffin/today`** (daily checkoff)
- **Public**: `/s/[slug]/book` → `TiffinSubscribeForm` (plan + pref + days + start date)
- **Key feature**: Daily delivery checklist at `/tiffin/today` with lunch/dinner sections, mark-all-delivered bulk action, skip-with-reason sheet
- **Deferred**: Auto monthly bill generation, customer-side pause/resume, weekly menu publish (Phase 2 Tier A)

### Laundry

- **Tables**: `laundry_jobs` (status: received, in_process, ready, delivered, issue_raised)
- **Provider routes**: `/laundry/jobs` (list), `/laundry/jobs/new`, `/laundry/jobs/[id]`, **`/laundry/today`** (status board)
- **Public**: `/s/[slug]/book` → `LaundryPickupForm` (multi-service, urgency, items, pickup window)
- **Key feature**: Today board with sections for Overdue / Pickups / In process / Ready (customer-pickup vs home-delivery split)
- **Deferred**: Public pickup form with structured slots, auto status-WA notifications, item photo proof

### Tutor / Coaching

- **Tables**: `students`, `tutor_sessions`, `tutor_fees`
- **Provider routes**: `/tutor/students`, `/tutor/students/new`, `/tutor/students/[id]`, **`/tutor/today`** (today's classes)
- **Public**: `/s/[slug]/book` → `TutorEnrolForm` (student name, grade, board, subjects multi-add, mode)
- **Key feature**: Today page lets tutor quick-log a 1-hr session per active student, or open modal for custom subject/time, then expand row to fill topic + homework
- **Deferred**: Auto fee generation, topic/syllabus tracker, parent WA report

### PG / Hostel

- **Tables**: `pg_listings`, `pg_visits`
- **Provider routes**: `/pg/listings`, `/pg/listings/new`, `/pg/listings/[id]`
- **Public**: generic booking form (not yet specialized)
- **Status**: Not yet deep-dived — uses generic flows currently
- **Deferred**: Public visit form, occupancy view, tenant tracking, rent log

### Clinic / Doctor

- **Tables**: `clinic_appointments`
- **Provider routes**: `/clinic/appointments`, `/clinic/appointments/new`, `/clinic/appointments/[id]`, **`/clinic/today`** (queue)
- **Public**: `/s/[slug]/book` → `ClinicAppointmentForm` (visit type + mode + 7-day date carousel + 30-min slot grid with busy slots greyed via `get_clinic_busy_slots` RPC)
- **Key feature**: Today queue lets doctor expand row to inline-edit symptoms/diagnosis/Rx and complete; per-row tap-paid
- **Deferred**: Prescription templates, past-visit history view, tele-consult video link

### Turf / Sports

- **Tables**: `turf_courts`, `turf_bookings` (with unique constraint on court+date+start_time)
- **Provider routes**: `/turf/bookings`, `/turf/bookings/new`, `/turf/bookings/[id]`, **`/turf/today`** (slots by court)
- **Public**: `/s/[slug]/book` → `TurfBookingForm` (court tile picker + date carousel + contiguous-hour grid + live total)
- **Key feature**: Today page has prominent arrival-code verifier (mono input → mark arrived). Slot grid groups by court.
- **Deferred**: UPI advance-payment deep-link, recurring bookings, peak/off-peak pricing tiers

### Gym / Fitness

- **Tables**: `gym_memberships`, `gym_checkins`
- **Provider routes**: `/gym/members`, `/gym/members/new`, `/gym/members/[id]`, `/gym/checkins` (existing check-in interface)
- **Public**: generic booking form
- **Status**: Not yet deep-dived
- **Deferred**: Expiring-membership WA reminders, public membership signup, day-pass quick-issue, class scheduling

### Retail / Shop

- **Tables**: `products` (with `low_stock_threshold` + `image_url`), `sales`, `sale_items`
- **Provider routes**: `/retail` (tiles), `/retail/pos` (POS), `/retail/products` (catalogue with quick-add + CSV import), `/retail/sales`, `/retail/khata` (credit ledger)
- **Public**: `/s/[slug]` renders `RetailCatalogue` (products grid + cart → WhatsApp order); no booking form
- **Key features**:
  - POS with cart, discount/tax, payment mode, auto receipt generation
  - CSV import with upsert mode (re-imports update by SKU)
  - Quick-add row on products list (3 fields, Enter to save)
  - Khata: customers with outstanding credit, per-customer expand to see unpaid sales, mark-paid per sale, WA reminder
  - Share-catalogue WhatsApp button
- **Deferred**: Barcode scan, loose/weighed items, day-close report, GST invoicing (Phase 2 Tier A)

### Rentals

- **Tables**: `rental_items` (with `late_fee_per_day` + `available_qty`), `rentals` (with `late_fee`, `damage_charge`, `return_notes`, `id_proof_note`)
- **Provider routes**: `/rentals` (bookings list), `/rentals/new`, `/rentals/[id]`, `/rentals/items` (inventory + quick-add)
- **Public**: `/s/[slug]` renders `RentalCatalogue` (item tiles + date-picker sheet → WhatsApp request)
- **Key features**:
  - Return-flow modal with late-fee auto-suggest, damage charge entry, refund-deposit toggle, settlement preview
  - Days-overdue banner with WA reminder
  - Receipt itemises late fee + damage + deposit refund
- **Deferred**: Real-time availability calendar, ID proof photo upload, pre/post damage photo, customer self-serve "extend by N days" link

### Service (generic)

- **Tables**: uses `orders` + `services_catalog` only
- **Provider routes**: `/orders`, `/orders/new`
- **Public**: generic booking form
- **Use case**: Freelancers, photographers, mehendi artists, salons, AC repair — anyone billing per job
- **Deferred**: Quote/estimate flow, recurring services, before/after photos

### Other (fallback)

The 11th type is `other` — kept as a last-resort catch-all but de-emphasised in the picker. Behaves like service generically.

---

## 8. Cross-cutting features

### Provider ↔ Consumer dual auth

- Single `auth.users` table from Supabase Auth
- `handle_new_user` trigger reads `raw_user_meta_data.role`:
  - `owner` (default) → creates a `profiles` row
  - `consumer` → creates a `consumer_profiles` row
- Provider routes live under `/(app)/...` (gated by middleware → redirect to `/login`)
- Consumer routes live under `/account/...` (gated by middleware → redirect to `/account/login`)
- A single user could have both rows (rare); the middleware just looks at which space they're trying to enter

### Bookings inbox

`/bookings` is the provider's incoming-request inbox. Anyone using the public shop link submits via the bookings table. Provider can:
- View structured details per business type (via the `StructuredDetails` renderer that branches on `details.subscription / appointment / turf / enrolment / pickup`)
- Verify the 4-digit confirmation code that the customer received
- Accept (auto-creates a customer + order) or Reject

**Open**: accepting a booking creates a generic `orders` row. **Phase 2 work** is to auto-create the matching domain entity (tiffin_subscription, clinic_appointment, etc.) from the structured details.

### Universal receipts (the viral loop)

- Single `receipts` table with `source_type` (sale, order, tiffin_bill, tutor_fee, rental, clinic, turf, laundry, custom), `source_id`, full snapshot of items/totals/payment.
- `token` column is an unguessable 16-char hex.
- Public `/r/<token>` page reads via `get_receipt_by_token` security-definer RPC. Increments `view_count`.
- Bottom of the receipt has a CTA: "Save all your receipts on Superlocal" → `/account/signup?ref=<token>`
- Consumer signup form reads the ref token and calls the RPC to get the issuing provider's user_id → writes it to `consumer_profiles.referred_by_user_id`
- This is the growth loop: every receipt is a measurable acquisition channel for the consumer side.

### WhatsApp templates

- `whatsappTemplates.ts` has per-business defaults for keys: `booking_received`, `booking_confirmed`, `payment_reminder`, `order_ready`, `feedback_request`, `receipt`
- Provider can override any of them in `profiles.whatsapp_templates` (jsonb)
- `TemplatesProvider` is mounted in the `(app)` layout, exposes:
  - `useWhatsAppMessage(key, vars)` — returns the resolved string for use in a single button
  - `useWhatsAppFiller(key)` — returns a stable function for use inside `.map()` callbacks (rules-of-hooks safe)
- Variables supported: `{name}`, `{amount}`, `{service}`, `{date}`, `{time}`, `{otp}`, `{shop}`, `{link}`

### Onboarding checklist

- Mounted on `/dashboard` for every provider until 6/6 done
- Auto-detects state: business_type picked, business_name set, shop_enabled, first customer added, first order/sale, first receipt sent
- Hides itself once everything is checked off

### PostHog analytics

- Root layout mounts `<PostHogProvider>` for SDK init + SPA `$pageview`
- Auth layouts mount `<PostHogIdentify>` to call `posthog.identify(user.id, { email, role, business_type })`
- ~15 custom events captured: `provider_signup`, `consumer_signup` (with `via_receipt` flag), `sale_completed`, `products_csv_imported`, `rental_created`, `rental_returned`, `booking_submitted` (with `business_type`), `qr_banner_downloaded`, `khata_reminder_sent`, plus today-page actions

### Cloudinary images

- `<CloudinaryUploader>` (`src/components/CloudinaryUploader.tsx`) — single or multi-file picker, direct browser upload via unsigned preset, preview tiles, remove buttons
- `<CloudinaryImage>` (`src/components/CloudinaryImage.tsx`) — drop-in `<img>` replacement that injects `f_auto,q_auto,w_<intrinsic>,dpr_auto` transforms; passes legacy Supabase Storage URLs through unchanged
- Used in: `AssetUploader` (shop photos), `ProductForm`, `RentalItemForm`
- See [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) for setup

### QR poster

- `/shop/qr` (auth-gated) generates a printable poster for any shop with `shop_enabled = true`
- Uses `react-qr-code` for the SVG
- Three actions: print (via `window.print()` + print CSS), save as PNG (`html-to-image`), share on WhatsApp
- Context-aware copy: "Scan to **book**" / "Scan to **order**" (retail) / "Scan to **reserve**" (rentals)

### Customer/CRM layer

- `customers` table is shared across all business types
- `CustomerPicker` component handles "existing or new" customer disambiguation by phone (300ms debounce on phone field)
- `resolveCustomer` helper upserts on `(user_id, phone)` so the same customer across multiple business types resolves to one row
- Stats fields (`total_orders`, `total_paid`, `total_outstanding`, `last_order_date`) maintained by triggers on `orders`

---

## 9. Deployment runbook

### Initial deploy from scratch (new Supabase + Vercel project)

1. **Supabase**:
   - Create project at https://supabase.com
   - SQL Editor → run each `supabase/schema*.sql` in order (V1 → V10.1)
   - Settings → API → copy URL + anon key
   - Authentication → URL Configuration → add `https://<your-vercel-domain>` to Site URL + Redirect URLs

2. **PostHog**:
   - Create project at https://app.posthog.com
   - Settings → Project → copy Project API key (starts with `phc_`)

3. **Cloudinary** (see [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) for the unsigned-preset gotcha):
   - Sign up → note cloud name
   - Settings → Upload → add Unsigned upload preset

4. **Vercel**:
   - Import the GitHub repo (must use `smileplis` account due to Hobby plan author binding)
   - Add env vars:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_POSTHOG_KEY`
     - `NEXT_PUBLIC_POSTHOG_HOST` (optional, defaults to US)
     - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
     - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
   - Deploy

### Ongoing deploys

`git push origin main` → Vercel auto-deploys. No special steps.

When a new schema migration lands, run it in Supabase SQL editor before the Vercel deploy completes (or your provider will hit "column does not exist" errors briefly).

### Git author gotcha

Vercel Hobby plan rejects deploys where the commit author email doesn't match an account with access to the Vercel project. Local git is configured to:
```
user.email = 96651481+smileplis@users.noreply.github.com
user.name  = smileplis
```
If you commit from a different machine without this config, the deploy will fail with "commit author did not have contributing access". Re-author the commit with `git commit --amend --reset-author` after fixing `git config`.

---

## 10. Scaling & capacity

### Current free-tier ceiling

- **~50–80 active provider businesses** doing daily work
- **~300–500K consumer page views / month**
- **~800K consumer image views / month** (post-Cloudinary; was ~100K before)
- **One viral shop with 10K+ visitors is no longer a problem** (was the most likely cap-blower pre-Cloudinary)

### Bottleneck order

| # | Bottleneck | When it bites |
|---|---|---|
| 1 | Vercel function invocations (1M/mo) | First wall for total page traffic |
| 2 | Supabase concurrent DB connections (60 direct / 200 pooler) | Burst spikes on viral shops |
| 3 | Supabase DB egress (5 GB/mo) | Roughly tied with #1 |
| 4 | Cloudinary egress (25 GB/mo) | 800K+ image views/month — far away |
| 5 | PostHog events (1M/mo) | 100–200K sessions/month |
| 6 | Supabase storage (1 GB) | Private files only; public images on Cloudinary |
| 7 | Vercel bandwidth (100 GB) | JS bundles + assets, rarely the wall |

### Cost to scale

- $45/mo (Vercel Pro $20 + Supabase Pro $25) → **~1,000–2,000 active providers**
- Cloudinary stays free until well past PMF; first paid tier is $99/mo at 225 GB

### Highest-ROI free unlocks (Phase 2)

1. **Middleware early-exit for public paths** — `src/lib/supabase/middleware.ts` runs `auth.getUser()` on every non-static request including `/s/`, `/r/`, login pages. Bail out for `PUBLIC_PATHS` before the Supabase call. **~30% reduction in DB queries.**
2. **Drop `force-dynamic` on `/s/[slug]`** — extract auth-aware "signed in as X" chip to a client island, set `revalidate=60`. **10–50× reduction in invocations on viral shops.**
3. **Drop `force-dynamic` on `/r/[token]`** — swap to a cookie-less Supabase client for the RPC call so Next can statically cache. Already has `revalidate=300` but isn't actually kicking in.

Combined: provider capacity ~50–80 → ~150–250 on free tier, page-view capacity 300K → 2–5M/month, **zero cost**.

---

## 11. Conventions, patterns & gotchas

### Patterns

- **Server components by default.** Drop into `'use client'` only for interactivity (forms, toggles, state).
- **Page = data fetch + render the right client component.** Server component does Supabase queries, passes data to a `<XYZClient>` for interactive bits.
- **Per-business branching by `business_type`.** Multiple places do this (dashboard, shop page, public catalogue, booking form router). When adding a new type, search for `business_type === ` to find branch points.
- **RLS gates everything.** The browser client is the anon key + the user's session cookie. No service-role keys ever sent to the browser.
- **Form structure**: section cards (`.card.p-4`), `<label className="label">…</label>`, `<input className="input" />`, error in red rose-50 box at bottom, primary action button last.

### Critical gotchas

1. **Icons can't cross server→client component boundaries as props.** Hit this with `SetupFlow`. Fix: import `BUSINESS_TYPES` directly inside the client component.

2. **`force-dynamic` is overused.** Some pages have it that don't need it. Auth-aware pages can often have the auth bit extracted to a client island and the rest cached.

3. **Partial unique indexes break `.upsert()`.** Hit this in v10.1 hotfix — Supabase upsert with `onConflict` can't target partial indexes (no way to pass the WHERE predicate). Use plain unique indexes; rely on NULL distinctness if needed.

4. **`bookings_owner_all` is `FOR ALL` (permissive).** It applies to INSERT but the WITH CHECK requires `auth.uid() = user_id`. For public bookings where consumer != owner, the additional `bookings_public_insert` policy is what allows it. Multiple permissive policies are OR'd in Postgres RLS.

5. **PostHog SDK is commonly adblocked.** When debugging "events aren't firing", test in incognito on mobile data first.

6. **Orphan routes**: `src/app/(app)/salon/...` and `src/app/(app)/repair/...` exist but are unreachable from the current setup flow (those business types were dropped before V6). Safe to delete; not a blocker.

7. **PG and Gym are partially built.** They have lists/new/[id] routes but no `/today` page and no specialized public form. They'll work via the generic flows but the experience is significantly worse than the other 5 modules that got deep-dives.

### Don'ts

- Don't reintroduce emojis. lucide-react icons only.
- Don't pass icon components from server to client. Import inside client.
- Don't write to `bookings.details` jsonb without adding a renderer branch in `BookingsList.tsx` → `StructuredDetails`.
- Don't add image uploads through Supabase Storage for public images. Use `<CloudinaryUploader>`.
- Don't add `force-dynamic` to public routes. Aim for ISR.
- Don't add new business types without updating: `businessTypes.ts`, `businessRoutes.ts`, `placeholders.ts`, `whatsappTemplates.ts`, and `/s/[slug]/page.tsx` branching.

---

## 12. Phase 2 backlog

See [PHASE_2_ROADMAP.md](PHASE_2_ROADMAP.md) for the canonical list — every deferred item from every deep-dive lives there, organised by module and Tier (A = next sprint candidates, B = second wave, C = speculative).

Highest-leverage items right now (across modules):

**Platform-wide**
- Caching unlocks (#10 above) — ~half day, free, ~3× capacity
- Booking → domain-entity conversion on accept
- Consumer `/browse` discovery page
- Auto monthly bills (tiffin_bills, tutor_fees)

**Per-module Tier A picks**
- Retail: barcode scan, day-close report, sales reports
- Rentals: real-time availability calendar, photo upload pre/post, ID proof photo, auto reminders
- Tiffin: public subscribe flow polish, auto bills, pause/resume
- Clinic: prescription templates, public slot picker polish
- Turf: UPI advance-payment deep-link, recurring bookings
- Tutor: auto fees, parent WA report per class
- PG: full deep-dive (Today page, public visit form, occupancy view, tenant tracking)
- Gym: full deep-dive (expiring-membership reminders, public signup, day-pass)

---

## 13. How decisions got made

A handful of decisions are worth flagging because they came up in the building process and influence what's idiomatic going forward.

**WhatsApp via `wa.me` not Business API.**
The user explicitly chose zero-cost over auto-send. Every WA action in the app generates a deep-link that opens the user's own WhatsApp with the message pre-filled. They tap send. No API approval, no per-message cost, no opt-in compliance work. The trade-off is that we can't auto-send reminders (a Phase 2 task that'd need the Business API).

**Provider-shown OTPs over SMS.**
The 4-digit confirmation codes for bookings, gym check-ins, turf arrivals are generated by the app and shown to the provider. The customer reads them out (or they're sent on WA). Zero SMS cost.

**Cloudinary for public images, Supabase for private docs.**
Hybrid by design. Public images are bandwidth-heavy (every shop view loads them) and don't need RLS. Cloudinary gives us 5× egress + auto-WebP for free. Private docs (ID proofs, prescription pads, future damage photos) stay on Supabase Storage because RLS controls access.

**Universal receipt as growth loop.**
The receipt page isn't just a bill — it's the primary consumer acquisition channel. Every receipt sent via WA links to a public page that has a "Save your receipts on Superlocal" CTA, and signups via that link attribute back to the issuing provider. This makes "send the customer a receipt" a measurable growth action, not just an admin task.

**No emojis ever.**
Decided early. Emojis render inconsistently across platforms (especially Indian Android) and feel cheap. lucide-react gives us a coherent icon set with strokeWidth control + tree-shaking.

**RLS is the source of truth, not the server.**
The Next.js layer is mostly server-rendered React + light data shaping. All authorization happens at the Postgres RLS layer. This means even if a bug lets a request through, the DB rejects it. The cost is more complex queries (security-definer RPCs for narrow public reads), but the safety win is huge.

**Force-dynamic on every (app)/* page is a tactical choice, not strategic.**
We did it because every page is personalised (provider-specific data + auth-aware nav). It's the wrong choice for public pages (`/s/[slug]`, `/r/[token]`) and that's why moving those to ISR is the highest-leverage Phase 2 unlock.

**Single Supabase project for everything.**
We could split prod / staging Supabase projects but haven't yet. Currently dev/prod both point at the same Supabase project on the user's account. Move to a real staging env before going beyond a handful of test providers.

---

## End

If something doesn't match what you see in the code, the code wins — this doc is a snapshot at the time of writing. Keep this updated as you make non-trivial changes; future-you will thank you.
