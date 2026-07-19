# Stall Availability and Schedule Implementation Plan

## Goal

Let Laku Sitok show whether a vendor's stall is open in a way that is both automatic and realistic:

- The saved opening and closing times decide the normal daily status.
- The vendor can still open early, close temporarily, or reopen when real life differs from the schedule.
- The vendor dashboard clearly shows the current state and a live countdown.
- The customer menu uses that same state to prevent orders when the stall is unavailable.

This is an operational feature, not a marketing feature. The existing Settings time pickers remain the source for the normal schedule, while the customer menu remains public and simple.

## Recommended status model

Use two layers rather than one fragile `open` boolean:

1. **Scheduled availability** is calculated from the vendor's saved daily opening and closing times in the Malaysia time zone.
2. **Manual override** is an optional vendor decision that temporarily wins over the schedule.

The effective stall status is:

```text
Manual “open now” override       → Open
Manual “temporarily closed”      → Closed
No active override + within hours → Open
No active override + outside hours → Closed
```

Every manual override has an explicit expiry. The dashboard offers a sensible suggested end time, but the vendor confirms it before saving:

- Before the normal opening time, **Open now** defaults to the normal closing time that day.
- During normal hours, **Close temporarily** defaults to the normal closing time, but the vendor can resume sooner.
- After normal closing time, **Open now** defaults to two hours and asks the vendor to confirm or choose an earlier end time.

This avoids a late-night action accidentally leaving the stall open through the next day.

## MVP behaviour

```text
Vendor saves Opens 10:00 AM / Closes 10:00 PM in Settings
        ↓
Laku Sitok calculates the current status in Asia/Kuala_Lumpur
        ↓
Dashboard shows “Open now — closes in 2h 15m”
        ↓
Vendor can choose “Close temporarily” if needed
        ↓
Customer menu remains browseable but disables ordering while closed
        ↓
When the stall reopens, ordering is enabled again
```

## Phase 1 — Store a machine-readable schedule

Create a Supabase migration such as `database/stall-availability.sql`.

- Add `opening_time` and `closing_time` columns to `public.marketing_settings` using PostgreSQL `time` values.
- Add `stall_override` with only `open`, `closed`, or `null`.
- Add `override_set_at` and `override_expires_at` timestamps.
- Keep the existing `operating_hours` text temporarily for existing marketing posts and backward compatibility.
- Backfill the two time columns from the currently saved `Daily: 10:00 AM - 10:00 PM` values when possible. If an old value cannot be read safely, leave it empty and ask the vendor to save it again in Settings.

Do not store a permanently changing `is_open` flag. The backend should calculate it from the schedule plus an active override, so it cannot become stale overnight.

**Checkpoint:** Each vendor has optional opening and closing time values plus a safe, expiring override.

## Phase 2 — Make Settings the schedule source

Update **Settings > Operations & presence**.

- Keep the existing native **Opens** and **Closes** time pickers.
- Save their values to `opening_time` and `closing_time`, while continuing to write the friendly `operating_hours` display text for Marketing.
- Validate that both values are provided together.
- Support overnight stalls: for example, 6:00 PM to 1:00 AM is valid and means the stall crosses midnight.
- Add concise helper copy: “This schedule automatically controls your customer ordering availability.”
- Keep the visual system already established: white card, pale-blue border, gold operations accent, navy labels, and theme-aware dark mode tokens.

**Checkpoint:** A vendor can set a valid daily schedule without typing a time string.

## Phase 3 — Add a single status service and API

Create a backend `stall-availability` service as the only place that calculates availability.

It should return a small, explicit payload:

```json
{
  "isOpen": true,
  "source": "schedule",
  "label": "Open now",
  "opensAt": "2026-07-20T10:00:00+08:00",
  "closesAt": "2026-07-19T22:00:00+08:00",
  "nextChangeAt": "2026-07-19T22:00:00+08:00",
  "scheduleConfigured": true,
  "timezone": "Asia/Kuala_Lumpur"
}
```

Add endpoints:

- `GET /api/stall-availability` — public-safe current status for the customer menu.
- `GET /api/vendor/stall-availability` — authenticated vendor version, including schedule and active override details.
- `PATCH /api/vendor/stall-availability/override` — vendor submits `open`, `closed`, or `clear`.

Rules:

- Use `Asia/Kuala_Lumpur` in the backend, never the browser's time zone.
- If schedule times are missing, mark the stall as unavailable and return a helpful vendor-facing setup message.
- An expired override is ignored automatically; it does not need a background job.
- The order-creation service must consult this same service before creating an order. Hiding the button in the UI alone is not sufficient.

**Checkpoint:** Dashboard, customer menu, and order creation all receive the same answer for “is this stall open?”

## Phase 4 — Dashboard stall-status card and countdown

Add a compact card near the top of the vendor dashboard, below or beside the welcome hero rather than competing with the sales metrics.

### Open state

- Emerald status dot and **OPEN NOW** label.
- Copy such as: “Customer ordering is active. Closes in 2h 15m.”
- Primary outline action: **Close temporarily**.

### Closed-before-opening state

- Navy/blue clock icon and **CLOSED** label.
- Copy such as: “Opens today at 10:00 AM — in 45m.”
- Primary action: **Open now**.

### Closed-after-hours state

- Copy such as: “Closed for today. Opens tomorrow at 10:00 AM.”
- Primary action: **Open now** for an intentional late opening.

### Manual state

- Show a small, readable chip: **Manual override**.
- When manually closed: **Resume service** button.
- When manually opened outside normal hours: **Return to schedule** button.

The countdown updates locally every minute (and more frequently only if the display needs seconds). It should use the server’s `nextChangeAt` value rather than reimplementing schedule logic in React.

Keep the card theme-aligned:

- Use semantic `--ls-*` dark/light tokens, not hard-coded pale text on pale panels.
- Emerald for active availability, amber only for upcoming/attention state, and clear text labels in every state.
- Use the existing rounded card, pale border, and compact operational typography.

**Checkpoint:** A vendor understands the current state and the next transition at a glance, and can override it in one tap.

## Phase 5 — Customer-menu behaviour

Update the public customer menu after the availability API is ready.

- Show a small status chip in the hero: **OPEN NOW** or **CLOSED — OPENS AT 10:00 AM**.
- Keep browsing, searching, categories, and item details available while the stall is closed.
- Disable **Add to cart**, the basket checkout action, and direct order submission while closed.
- Explain the state near the disabled action: “Ordering opens at 10:00 AM.”
- If a cart already contains items when the vendor closes, preserve the cart but prevent checkout and explain why.
- Re-check availability in the backend during `POST /api/orders`, returning a friendly `409` error if the customer submits just after closing.

Do not fake a busy kitchen status or promise preparation times when the stall is closed.

**Checkpoint:** Customers never create new orders when the stall is closed, even if they keep an old page open.

## Phase 6 — Marketing integration (small enhancement)

Keep this deliberately light.

- **We're open now** can display a helpful warning if the stall is currently closed by schedule or override: “Your stall is currently closed. Open it first, or choose Opening later.”
- **Opening later** can prefill the next scheduled opening time as a suggestion.
- Generating or sharing a marketing post never changes the operational stall status automatically.

This protects the truthfulness of marketing without making Marketing responsible for opening the business.

**Checkpoint:** Marketing reflects operational state but cannot secretly change it.

## Phase 7 — Test plan

Test with a deterministic backend clock or carefully selected test times.

1. Same-day schedule: 10:00 AM–10:00 PM; confirm open during hours and closed before/after.
2. Overnight schedule: 6:00 PM–1:00 AM; confirm it remains open after midnight until 1:00 AM.
3. Manual early open; confirm the customer menu enables ordering and the override expires at the next schedule boundary.
4. Manual temporary close during hours; confirm customer ordering disables and the dashboard can resume service.
5. Customer has an old menu page open; close the stall and submit an order; confirm backend rejects it safely.
6. Missing schedule; confirm dashboard asks the vendor to complete Settings and customer ordering stays unavailable.
7. Refresh dashboard; confirm countdown and override state remain accurate.
8. Dark and light mode; confirm the status card, chip, buttons, and disabled text remain readable.
9. Phone width; confirm the action is easy to tap and the countdown does not wrap awkwardly.
10. Marketing; confirm an “open now” campaign warns when the operational stall is closed.

## What the vendor needs to do

During implementation, the vendor only needs to:

1. Run the single Supabase migration once.
2. Set their normal opening and closing times in Settings.
3. Test an open, closed, early-open, and temporary-close scenario from both the dashboard and customer menu.

No external API key, scheduled server job, or paid service is required.

## Definition of done

- The normal stall state is calculated from saved times in `Asia/Kuala_Lumpur`.
- A vendor can manually open, temporarily close, resume, and return to the normal schedule.
- The dashboard clearly shows the status and a correct live countdown.
- The customer menu remains browseable but cannot create orders while unavailable.
- The backend enforces availability independently of the user interface.
- Marketing may read the status but never changes it automatically.
- The feature is readable and polished in light mode, dark mode, desktop, and phone layouts.
