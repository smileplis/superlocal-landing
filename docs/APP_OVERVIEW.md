# Superlocal — App Overview

Superlocal is a mobile-first web app that lets a small local-service operator run their day from their phone: take orders, mark them done, chase unpaid amounts, and message customers — without spreadsheets, paperwork, or training.

This document explains:
1. What the app does end to end
2. The user journey
3. Each business type — what it captures, what is customizable, and how it is used in practice
4. Core feature reference (dashboard, orders, payments, WhatsApp)
5. Data model

---

## 1. What the app does

Superlocal is a single-tenant tool: **one logged-in user owns their business and their orders.** Row-level security (Supabase RLS) ensures one operator can never see another's data.

The operator can:

- **Sign in** with email + password (sign-in is mandatory at every visit).
- **Set up a business profile** the first time they log in — pick a business type from a card grid, name the business, and customize their list of services.
- **See a dashboard** showing today's orders, completed-vs-pending split, and total pending payment amount.
- **Add an order** with customer name, phone, service, date, amount, payment status, plus extra fields specific to their business type.
- **Browse orders** filtered by Today or All. Each order has two toggles (Pending↔Completed, Paid↔Unpaid) and two action buttons (Call, WhatsApp).
- **View a Payments screen** that lists only unpaid orders, shows the running total owed, and lets them mark items paid inline.
- **Tap WhatsApp** on any order to open `wa.me` with a pre-filled, URL-encoded payment reminder addressed to that customer for that exact amount.

The app is intentionally bare: no charts, no exports, no role management. The target user is a tiffin aunty, a laundry uncle, a tutor, a barber — people who want a notebook replacement, not a CRM.

---

## 2. User journey

```
First visit                 Returning user
-----------                 --------------
/  → /login                 /  → /dashboard (auto)
  ↓ sign up                   ↓
/signup                     uses app:
  ↓ confirm + sign in         /dashboard | /orders | /orders/new | /payments
/setup (business type
  picker → name +
  services + preview
  of extra fields)
  ↓ Save & Continue
/dashboard
```

The route guard ([src/middleware.ts](../src/middleware.ts) + [src/app/(app)/layout.tsx](../src/app/(app)/layout.tsx)) enforces:

- No session → forced to `/login`.
- Session but `profiles.setup_complete = false` → forced to `/setup`.
- Session and setup complete → free to use the app.

Logging out (top-right) clears the session and bounces back to `/login`.

---

## 3. Business types

Each business type is defined in [src/lib/businessTypes.ts](../src/lib/businessTypes.ts). A business type has:

- **id** — internal key stored in `profiles.business_type`.
- **name + icon + description** — what the operator sees on the setup card.
- **defaultServices** — pre-filled service chips, fully editable.
- **fields** — extra per-order inputs (rendered automatically on the Add Order form, stored in `orders.service_details` as JSON).

Field types supported: `text`, `number`, `select` (with options).

Below is each type, what it is for, what it captures, and how the operator typically uses it.

---

### 3.1 🍱 Tiffin / Meal Service

**Who this is for**
Home cooks, dabba-walas, and mess kitchens delivering daily meals to office workers, hostel students, and senior citizens.

**Default services (editable on setup)**
- Veg Tiffin
- Non-Veg Tiffin
- Lunch Only
- Dinner Only

**Per-order extra fields**

| Field | Type | Purpose |
|---|---|---|
| Meal Type | select: Lunch / Dinner / Both | Which slot the customer subscribed to today |
| Number of Meals | number | Quantity (e.g., 2 boxes for a couple) |
| Delivery Slot | text | Free-form window like "12:00 – 1:30 PM" |

**Typical flow**
1. Morning: open `/orders/new` for each new customer or one-off order.
2. Through the day: tick **Mark Completed** on each order as the box goes out.
3. Evening: open `/payments` to see who hasn't paid for the week and tap **WhatsApp** to send each one a reminder.

**Why these fields**
Tiffin operators care about *which meal*, *how many boxes*, and *when to deliver* — that's the daily routing decision. Service type ("Veg Tiffin") plus these three fields fully describe a delivery.

---

### 3.2 🧺 Laundry / Dry Clean

**Who this is for**
Neighborhood laundry shops doing wash-and-fold, ironing, and dry cleaning, often with home pickup and delivery.

**Default services (editable on setup)**
- Wash & Fold
- Wash & Iron
- Iron Only
- Dry Clean

**Per-order extra fields**

| Field | Type | Purpose |
|---|---|---|
| Number of Items | number | For piece-rate billing (e.g., 12 shirts) |
| Weight (kg) | number | For per-kg billing (e.g., 3.5 kg wash) |
| Urgency | select: Normal / Express (24h) / Same Day | Drives turnaround SLA and pricing |

**Typical flow**
1. Customer drops a bundle → operator opens `/orders/new`, enters items or weight, picks urgency.
2. When the bundle is washed/ironed → flip the order to **Completed**.
3. On pickup → flip to **Paid**. If picked up on credit → leave Unpaid; the order surfaces in `/payments` with the running tab.

**Why these fields**
Laundry shops bill by item *or* by weight — both fields exist so the operator can use whichever model fits. Urgency determines whether something jumps the queue and is charged extra.

---

### 3.3 📚 Tutor / Coaching

**Who this is for**
Private tutors, after-school coaches, and small coaching classes. Works for one-on-one and batch teaching.

**Default services (editable on setup)**
- Maths
- Science
- English
- Hindi

**Per-order extra fields**

| Field | Type | Purpose |
|---|---|---|
| Subject | text | Specific topic for the session ("Algebra", "Class 10 Physics") |
| Class / Grade | text | Student's grade level |
| Hours | number | Session length, used for hourly billing |
| Mode | select: Online / Offline / Hybrid | Where the class happens |

**Typical flow**
1. Each tuition session = one order, dated to that day.
2. Mark **Completed** at end of class.
3. Most tutors get paid monthly — the order stays **Unpaid** until the parent pays. `/payments` then shows everyone with an outstanding balance for the month.
4. Use **WhatsApp** to send fee reminders without typing the message every time.

**Why these fields**
Subject + Class lets a tutor see at a glance what they taught (useful when juggling multiple students). Hours supports hourly rates. Mode is now common after the shift to online classes.

---

### 3.4 💇 Salon / Beauty

**Who this is for**
Local salons and home-visit beauticians offering hair, nails, makeup, and grooming.

**Default services (editable on setup)**
- Haircut
- Hair Color
- Facial
- Manicure
- Pedicure

**Per-order extra fields**

| Field | Type | Purpose |
|---|---|---|
| Duration (minutes) | number | Service duration, helps schedule the day |
| Location | select: At Salon / Home Visit | Whether the customer comes in or the stylist travels |

**Typical flow**
1. Walk-in or appointment → operator logs an order with the service and duration.
2. Mark **Completed** when service is done.
3. Most salons take payment immediately — toggle **Paid** at checkout. Home visits are sometimes paid later, in which case `/payments` keeps track.

**Why these fields**
Duration is what salons schedule against. Location matters because pricing and travel time differ for home visits.

---

### 3.5 🔧 Repair / Handyman

**Who this is for**
Plumbers, electricians, AC techs, appliance repair shops — anyone billing for visit + parts + labor.

**Default services (editable on setup)**
- Plumbing
- Electrical
- AC Repair
- Appliance

**Per-order extra fields**

| Field | Type | Purpose |
|---|---|---|
| Issue | text | Free-form description ("Leaking kitchen tap", "AC not cooling") |
| Visit Charge (₹) | number | Base call-out fee, shown alongside the total amount |

**Typical flow**
1. Customer calls → operator logs an order, captures the issue and quotes a visit charge.
2. Tech goes on site → operator updates the **Amount** if parts/labor add up to more.
3. Mark **Completed** after the job is finished.
4. Mark **Paid** when collected (often in cash on the spot, occasionally invoiced).

**Why these fields**
"Issue" is the work order summary the technician carries to the site. Visit Charge is captured separately because customers often confirm the call-out fee before booking.

---

### 3.6 🏪 Other

**Who this is for**
Anything that doesn't fit the buckets above — a flower shop, a print shop, a pet groomer, a freelance designer.

**Default services**
None — the operator types in their own list during setup.

**Per-order extra fields**

| Field | Type | Purpose |
|---|---|---|
| Notes | text | Free-form per-order detail |

**Typical flow**
Same as the others — add order, mark done, mark paid, message reminders. The free-form Notes field replaces structured custom fields, so the operator can write whatever they need.

**Why this exists**
The MVP can't anticipate every micro-business. "Other" is the escape hatch so anyone can start using the app on day one. New types should be added to [src/lib/businessTypes.ts](../src/lib/businessTypes.ts) when a category becomes common enough.

---

## 4. Core features (cross-business)

These work the same regardless of business type.

### 4.1 Sign in / Sign up
- Email + password via Supabase Auth.
- A trigger ([supabase/schema.sql](../supabase/schema.sql)) auto-creates a `profiles` row on signup, so the user always has a profile to fill in.
- Middleware redirects unauthenticated users away from app routes and authenticated users away from `/login`/`/signup`.

### 4.2 Business setup
- Card grid of business types — large icons, short descriptions, mobile-friendly.
- After picking a type, the operator names the business and edits the service chip list. Default services are pre-loaded; the operator can remove any chip with a tap and add custom ones.
- A preview shows the business-type-specific extra fields they will be asked for on every order.
- Saved into `profiles.business_type` and `profiles.business_settings.services`. Sets `setup_complete = true` so the app stops bouncing the user back here.

### 4.3 Dashboard (`/dashboard`)
Four stat tiles:

| Tile | Source | Why it matters |
|---|---|---|
| Today's Orders | count of orders where `date = today` | Volume snapshot |
| Pending Payments | sum of `amount` where `payment_status = unpaid` | Total money owed across all time |
| Completed Today | count where `date = today AND status = completed` | Progress through the day |
| Pending Today | count where `date = today AND status = pending` | Work still to do |

Plus two big action buttons: **Add Order** and **View Payments**.

### 4.4 Orders (`/orders`)
- Filter pills: **Today** / **All**.
- Each order is a card showing customer, service, phone, date, amount, payment chip.
- Two toggle buttons: Pending↔Completed, Paid↔Unpaid. Optimistic UI — flips instantly, syncs to Supabase, reverts on error.
- Two action buttons: **Call** (`tel:` link) and **WhatsApp**.
- Unpaid cards get a soft-red background so they stand out from a list of paid ones.

### 4.5 Add Order (`/orders/new`)
- Common fields: Customer Name, Phone Number, Service, Date (defaults to today), Amount, Payment Status (defaults to Unpaid).
- Service is a dropdown of the configured services + an "Other" option that reveals a free-text input.
- Below the common fields, an "Extra details" section appears with the business-type-specific fields. Filled-in values go to `orders.service_details` as JSON.
- On submit → insert order → redirect to `/orders`.

### 4.6 Payments (`/payments`)
- A red banner card at the top: total pending amount + count of unpaid orders.
- Below it, every unpaid order rendered as the same `OrderCard` used on `/orders`.
- One tap on a card's **Mark Paid** button removes it from the unpaid list and updates the total.
- Empty state shows "All caught up 🎉" when nothing is owed.

### 4.7 WhatsApp integration
[src/lib/utils.ts](../src/lib/utils.ts) builds the link:

```
https://wa.me/91<phone>?text=<urlencoded message>
```

- Phone is stripped of non-digits. If the result is 10 digits, `91` is auto-prefixed (India default). Numbers with their own country code pass through untouched.
- Default message: `"Hi <name>, this is a reminder for your pending payment of ₹<amount>. Please complete it. Thank you!"`
- Personalized per order — name and amount are interpolated, then the whole string is `encodeURIComponent`'d so emojis, spaces, and the rupee symbol survive intact.

### 4.8 Bottom navigation
Four tabs, fixed to the bottom of the screen:

- 🏠 Home → `/dashboard`
- 📋 Orders → `/orders`
- ➕ Add → `/orders/new`
- 💰 Payments → `/payments`

Plus a "Sign out" link in the top header.

---

## 5. Data model

Two tables. Both have RLS enabled and only allow rows scoped to `auth.uid()`.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Same as `auth.users.id` |
| business_name | text | e.g., "Sharma Tiffin Service" |
| business_type | text | One of the IDs from [businessTypes.ts](../src/lib/businessTypes.ts) |
| business_settings | jsonb | Currently `{ services: string[] }`; room to grow |
| setup_complete | boolean | Gate flag for routing |
| created_at | timestamptz | |

Auto-populated by a trigger on `auth.users` insert ([supabase/schema.sql](../supabase/schema.sql)).

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid FK → auth.users | Cascade delete |
| customer_name | text | |
| phone | text | Stored as entered; cleaned only when building `tel:` / `wa.me` |
| service | text | One of the configured services or a custom string |
| service_details | jsonb | The business-type-specific fields, e.g., `{ meal_type: "Lunch", meals_count: 2 }` |
| date | date | Service date — defaults to today on insert |
| status | text | `pending` or `completed` |
| payment_status | text | `unpaid` or `paid` |
| amount | numeric(10,2) | INR |
| created_at | timestamptz | |

Indexed by `(user_id, date desc)` for fast list queries.

---

## 6. Extending the app

To add a new business type:

1. Append an entry to `BUSINESS_TYPES` in [src/lib/businessTypes.ts](../src/lib/businessTypes.ts):
   ```ts
   {
     id: "carwash",
     name: "Car Wash / Detailing",
     icon: "🚗",
     description: "Mobile car wash, detailing, polishing.",
     defaultServices: ["Basic Wash", "Premium Wash", "Interior Detail"],
     fields: [
       { key: "vehicle", label: "Vehicle", type: "text", placeholder: "Hyundai i20" },
       { key: "package", label: "Package", type: "select", options: ["Basic", "Premium"] },
     ],
   }
   ```
2. That's it — the type appears on the setup picker, and its fields automatically render on the Add Order form for users who choose it.

No database migration is needed because the extra fields live in `orders.service_details` (jsonb).
