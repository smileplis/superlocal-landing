# Superlocal — Phase 2 Roadmap

Living doc. Anything we explicitly *defer* from a module deep-dive goes here so we don't lose it. Format per module:

- **Tier A** — strong candidates for the next sprint
- **Tier B** — second wave; meaningful but not blocking
- **Tier C** — speculative; consider only after retention signal

---

## Retail

_Deep-dive shipped: catalogue / khata / quick-add / share / dashboard upgrade (2026-05-11)._

### Tier A
1. **Barcode scan via phone camera** — `html5-qrcode`; speeds POS adds & quick-add 5x. Critical for kirana / mobile / pharmacy.
2. **Loose / variable-price line in POS** — keypad row to add a "₹50 vegetables" line without a product row. Common for fruit/veg/sweets/meat.
3. **Day-close report** — at end of day: cash counted vs cash sales, UPI total, credit added, net deposit suggested. Owner ritual.
4. **Sales reports** — weekly/monthly trend, by category, by hour-of-day. Drives stocking decisions.
5. **Parked sales / hold cart** — pause mid-checkout (customer stepped away), resume later. Standard POS feature.

### Tier B
6. **Bulk price update** — select N products by category → "increase by 5%" or set new value. Saves hours when supplier raises prices.
7. **GST invoice mode** — HSN per product, CGST/SGST split on receipt, GSTIN on profile. Needed once revenue thresholds hit.
8. **Multi-tier pricing** — retail vs wholesale per customer. Niche but high-value for wholesalers.
9. **Customer order capture in DB** — convert the WhatsApp cart from `RetailCatalogue` into a real `bookings` record so the owner can accept → auto-create sale in one tap.
10. **Auto-hide out-of-stock on catalogue** — toggle: hide vs show with "Out of stock" badge.

### Tier C
11. **Supplier directory + reorder PO** — track suppliers, generate reorder list, send as WhatsApp PO.
12. **Inventory adjustments log** — record damage/spoilage/theft separately from sales-driven stock changes.
13. **Product expiry tracking** — for pharmacy / dairy / bakery. Alerts X days before expiry.
14. **Loyalty / points** — simple punch card or ₹-back program.

---

## Rentals

_Deep-dive shipped: public catalogue / late fee / damage charge / due-today dashboard (2026-05-11)._

### Tier A
1. **Real-time availability calendar** — date-aware check on items so customer can't request overlapping dates. Today's UI shows total qty but doesn't subtract live bookings by date range.
2. **Photo upload — pre-rental + post-rental** — damage proof. Two photo slots per rental for "before" and "after". Avoids he-said-she-said.
3. **ID proof photo upload** — store driving licence / Aadhaar on the rental record. Currently we only capture as free-text notes.
4. **Customer self-serve "extend by N days" link** — owner sends a link; customer taps "Extend 2 more days" → updates rental + recalc total.
5. **Pickup & return-due WhatsApp reminders (auto)** — at day-of pickup ("see you today!") and morning of return-due ("return by 6pm"). Currently manual.

### Tier B
6. **Multi-item rental in one booking** — customer rents 3 things together (event equipment use case). Cart-style on consumer side; single transaction on provider side.
7. **Damage-charge automation** — predefined charges per item (helmet missing = ₹500, scratch = ₹1000); tap to apply.
8. **Loyalty pricing for regulars** — auto 10% off for customers with N+ past rentals.
9. **Capture rental terms / waiver signature** — typed name + checkbox; PDF on receipt.
10. **Restructure routes** — `/rentals` becomes a home dashboard, bookings list moves to `/rentals/bookings`, detail at `/rentals/bookings/[id]`. Cosmetic but matches retail pattern.

### Tier C
11. **Multi-location pickup/return** — for chain rentals with multiple outlets.
12. **Insurance add-on at checkout** — flat fee, opt-in.
13. **Recurring/subscription rental** — monthly bike rental, auto-renew with payment reminder.
14. **QR-code receipt scan on return** — verify identity, log return timestamp.
15. **Maintenance log per item** — service date, km/hours used, next service due (for bikes/cars).

---

## Tiffin

_Today-page shipped (2026-05-11). Next: public subscribe flow + auto bills._

### Tier A
1. **Public "Subscribe" flow on `/s/[slug]`** — replace the generic booking form with a plan picker (lunch/dinner/both, veg/nonveg, address, days), creating a `tiffin_subscriptions` record on accept.
2. **Auto monthly bill generation** — cron / button at month-end to roll up `tiffin_deliveries` into a `tiffin_bills` row per customer with WA-send link.
3. **Pause/resume from detail page** — quick "pause for 5 days" action with date pickers; customer-facing self-serve via signed link.
4. **Weekly menu publish** — owner sets the next week's menu, public catalogue & WA broadcast.

### Tier B
5. **Route optimisation hint** — given customer addresses, suggest delivery order for the day.
6. **Customer rating on each delivery** — emoji react via WA, aggregated.
7. **Multiple meal variants per slot** — e.g. paneer vs egg today; customer picks via WA.
8. **Delivery photo proof** — attach a snap from the door.

### Tier C
9. **Substitute / replacement delivery** — when customer skips, offer the meal to waitlist.

---

## Laundry

_Today-page shipped (2026-05-11). Next: public pickup request + receipt._

### Tier A
1. **Public "Request a pickup" form on `/s/[slug]`** — date+time slot, items rough count, address, special instructions.
2. **Status WA auto-notify** — when status flips to ready / delivered, fire the right template.
3. **Receipt at delivery** — auto-create a universal receipt on `delivered` so the customer gets the bill on WA.
4. **Item photos pre/post wash** — for delicate items where damage is a real risk.

### Tier B
5. **Pickup route / batch view** — group today's pickups by area, show as a route list.
6. **Repeat-customer recall** — "You usually wash 8 shirts; same again?" prefill on the booking form.
7. **Loose items vs tagged items** — pricing tier per item type stored centrally, applied on intake.
8. **Express / same-day surcharge logic** — auto-apply when urgency != normal.

### Tier C
9. **Pickup/delivery vehicle assignment** — multi-driver shops.

---

## Tutor / Coaching

_Today-page shipped (2026-05-11). Next: enrolment flow + auto fees._

### Tier A
1. **Public "Enrol" form on `/s/[slug]`** — capture student name + grade + board + target subjects.
2. **Auto monthly fee generation** — roll up attended `tutor_sessions` into `tutor_fees` at month-end; manual "generate now" button.
3. **Topic plan / syllabus tracker** — list of topics per student; tick off as covered.
4. **Parent WhatsApp report after each class** — sent automatically with topic + homework.

### Tier B
5. **Schedule view (week ahead)** — calendar-grid for the tutor.
6. **Quiz / test result logging per student** — visible to parent on a shared link.
7. **Group/batch sessions** — one session linked to N students, attendance per student.
8. **Demo class booking** — public CTA: book a free trial.

### Tier C
9. **Online class link auto-generation** (Google Meet / Jitsi).
10. **Parent self-serve portal** — see attendance, fees, reports.

---

## PG / Hostel

_Not yet deep-dived._

### Tier A
1. **Public visit-request form on `/s/[slug]`** — date picker, gender filter, room-type filter.
2. **Occupancy view** — per listing: total beds vs occupied; tenant list.
3. **Tenant tracking entity** — separate from `customers`: which tenant in which room, since when, monthly rent, deposit.
4. **Rent collection log** — per tenant per month; outstanding view (like khata).
5. **Visit request inbox** — quick respond on WA, mark visited / converted / rejected.

### Tier B
6. **Move-in / move-out workflow** — checklist + deposit settlement.
7. **House rules signing** — typed name + checkbox, PDF.
8. **Maintenance request inbox** — tenants raise complaints via WA / link.

---

## Clinic

_Today-page shipped (2026-05-11). Next: slot picker + Rx templates._

### Tier A
1. **Public time-slot booking on `/s/[slug]`** — show available slots for the next 7 days, capacity per slot, mode (in-clinic/tele).
2. **Prescription templates** — quick-insert common Rx for the doctor's specialty.
3. **Past visit history on detail** — see prior visits + diagnoses on the same patient.
4. **Tele-consult mode** — auto-generate a video call link (Google Meet / Jitsi) for `mode=tele`.
5. **Recall / follow-up reminder** — auto WA on `follow_up_date`.

### Tier B
6. **Patient self-serve booking with no signup** — just phone+name → OTP.
7. **Lab/diagnostic referral** — add a lab partner contact, share referral on WA.
8. **EMR-lite** — vitals (BP, weight) per visit, charted over time.

### Tier C
9. **Prescription PDF with clinic letterhead.**
10. **Integration with ABDM / Aadhaar Health ID.**

---

## Turf

_Today-page shipped (2026-05-11). Next: public slot picker + multi-court._

### Tier A
1. **Public slot picker on `/s/[slug]`** — visual grid: courts × hours, available slots highlighted, tap to book.
2. **Advance payment via UPI deep-link** — generate UPI intent URL + mark advance_paid on confirmation upload.
3. **Block dates / closures** — owner blocks a court for maintenance.
4. **Recurring booking** — "every Sunday 7am for 4 weeks" creates 4 bookings.
5. **Pricing tiers** — peak vs off-peak (weekend vs weekday, evening vs morning).

### Tier B
6. **Equipment add-ons** — bat/ball/jersey rental as a line item.
7. **Refund flow for cancellations** — partial refund based on hours-to-slot.
8. **Public leaderboard / repeat-customer badge.**

### Tier C
9. **Live match scoreboard at the venue (display mode).**

---

## Gym

_Not yet deep-dived._

### Tier A
1. **Expiring memberships WA reminder** — auto WA template 7 days before expiry; "Renew" CTA.
2. **Public "Start membership" CTA on `/s/[slug]`** — plan picker (monthly/quarterly/yearly/day-pass).
3. **Day pass quick-issue** — at counter: 1-tap day pass, generate QR.
4. **Trainer assignment + slot booking** — book a slot with a trainer.
5. **Class schedule** — yoga / zumba batches with capacity caps.

### Tier B
6. **Member self-serve check-in via QR** — member opens link, scans QR on counter, gym logs it.
7. **Body metrics log per member** — weight / BMI / measurements over time.
8. **Diet plan attached to member.**

### Tier C
9. **Hardware integration** — RFID / biometric check-in turnstile.
10. **Class waitlist + auto-promote on cancel.**

---

## Cross-cutting (platform-wide)

### Tier A
- **Booking → domain entity conversion on accept** — when a public booking is accepted, auto-prefill the matching domain form (tiffin_subscription, clinic_appointment, etc.) so providers don't re-type.
- **Consumer `/browse` / discovery page** — locality + business-type filter. Without this, consumers can only reach shops via direct link, which kills the marketplace side.
- **PDF receipt generation** — currently print-CSS only. For email/messaging-only customers this matters.
- **Auto monthly bills** — for tiffin and tutor, auto-generate `tiffin_bills` / `tutor_fees` at month-end based on deliveries/attended sessions.

### Tier B
- **Provider Slack/email daily digest** — "Yesterday: 3 sales, ₹X, 2 new bookings". Retention nudge.
- **Multi-staff per provider** — owner adds employees with limited permissions (POS-only, no settings).
- **Multi-currency** — initial scope is INR only.
- **Webhooks for advanced integrations** — Zapier-style hooks on booking_created, sale_completed, etc.
- **In-app analytics dashboards** — currently providers see PostHog dashboards externally; bring summary in-app.

### Tier C
- **Two-way WhatsApp** (via WA Cloud API) — bot that confirms bookings, sends reminders automatically. Requires WA Business API approval + per-message cost.
- **UPI deep-link payments** — show QR + UPI intent link in receipt; mark paid on webhook.
- **Tax / accounting export** — Tally / QuickBooks compatible export.
- **Marketplace fees + commission** — when we mature into a true two-sided market.
