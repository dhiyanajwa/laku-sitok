# Stall-Opening Marketing Agent Implementation Plan

## Goal

Help a vendor announce that their stall is open with a polished, truthful WhatsApp-Status-ready post. The vendor fills in their business facts once, selects a daily announcement type, reviews the AI draft, and explicitly chooses to share it.

This replaces the current product-first marketing entry point. A product may be mentioned as an optional highlight, but a campaign never requires a product or low-stock trigger.

## MVP experience

```text
Vendor opens Marketing
        ↓
Chooses: We are open now / Opening later / Today's special / Closing soon
        ↓
Adds an optional short daily note
        ↓
Marketing Agent creates an editable opening announcement
        ↓
Vendor approves it
        ↓
Vendor opens WhatsApp and chooses My Status themselves
```

## Scope and safety rules

### Included

- Text-only opening announcements in the vendor's chosen language and tone.
- One-time business profile settings: location, operating hours, useful links, selling points, and hashtags.
- Optional current menu item as a highlighted special.
- Draft, edit, approve, copy, and owner-assisted WhatsApp sharing.
- The existing Laku Sitok visual system remains the design contract: the same light surfaces, navy text, emerald primary actions, purple AI accents, rounded cards, and responsive spacing.
- A recorded `share opened` activity, never a claim that the Status was posted.

### Not included in this MVP

- Automatic posting to WhatsApp, Facebook, or any customer group.
- Facebook sharing or publishing. Keep all Facebook-related UI and backend code deferred.
- Using customer names, phone numbers, order details, or private sales data in prompts.
- Promoting an item because it is low in stock. Stock is only a quiet guard that prevents an unavailable item from being selected as a highlight.

## Phase 0 — Agree the announcement model

Define the four initial campaign types:

| Type | Vendor intent | Example opening line |
| --- | --- | --- |
| `stall_opening` | The stall is open now | “We’re open today!” |
| `opening_later` | The stall will open at a stated time | “See you from 4:30 PM!” |
| `today_special` | The stall is open and has an optional highlight | “Today’s highlight: Burger Special.” |
| `closing_soon` | A final reminder before closing | “Last call before 6 PM!” |

Decide the default language and tone. The example screenshot suggests a warm Malaysian Malay/English mix, but this must remain a vendor preference—not a hard-coded writing style.

**Checkpoint:** We agree the four actions, default language/tone, and that WhatsApp sharing remains manual.

## Phase 1 — Add a vendor marketing profile

Extend `marketing_settings` so the vendor can enter the facts that make an opening post useful:

- Location text.
- Operating hours.
- Google Maps link.
- WhatsApp order link.
- Food-delivery link (optional).
- Review link (optional).
- Short stall tagline (optional).
- Three to five selling points, for example: `Homemade beef`, `Not oily`, `Budget-friendly`.
- Default hashtags.
- Existing language, tone, and hashtag preference.

Validation rules:

- All links must be valid `https://` URLs.
- Each text field has a sensible length limit.
- Selling points and hashtags are entered by the vendor, then stored as lists.
- Settings stay scoped to `vendor_id`.

The UI presents this as an editable **Stall marketing profile** card, using the existing Marketing page theme. It does not change the global navigation or vendor dashboard design.

**Checkpoint:** A vendor can save their own reusable stall facts; no AI call is involved.

## Phase 2 — Evolve campaign data without losing existing drafts

Create one migration that keeps old product campaigns readable and makes product selection optional for new campaigns.

- Add `campaign_type` with a default such as `product_promotion` for existing rows.
- Allow `selected_product_id`, `product_name`, and `product_price` to be null for opening campaigns.
- Add `daily_note` for an optional vendor-entered note, such as “Fresh patties just arrived.”
- Keep existing caption, call to action, hashtags, approval status, timestamps, and activity history.
- Add campaign types to the database constraint: `product_promotion`, `stall_opening`, `opening_later`, `today_special`, and `closing_soon`.

No campaign is generated, approved, or shared by this migration.

**Checkpoint:** Existing campaigns still display, while a new opening campaign can be saved with no selected product.

## Phase 3 — Grounded Marketing Agent generation

Update the generation endpoint to accept:

```json
{
  "campaignType": "stall_opening",
  "dailyNote": "Fresh local favourites are ready",
  "highlightProductId": "optional UUID"
}
```

Before the Qwen call, the backend builds a facts-only prompt from:

- The vendor's saved marketing profile.
- The requested campaign type and daily note.
- The optional highlighted item only if it is currently available.
- Current price only if the vendor deliberately selected that item.

The model returns structured content:

```json
{
  "title": "OPEN NOW!",
  "caption": "...",
  "callToAction": "...",
  "hashtags": ["..."],
  "reason": "..."
}
```

Required safeguards:

- Tell the model not to invent prices, hours, locations, links, ingredients, delivery services, or health/quality claims.
- Omit a field if the vendor has not provided it; never substitute a fake value.
- Validate the returned object, text length, and hashtag count before saving.
- If essential profile details are missing, return a clear **Complete your stall marketing profile first** response instead of creating a weak draft.
- Retain the existing rate limit and vendor approval requirement.

**Checkpoint:** A click on **We’re open now** creates a complete, editable, grounded opening draft.

## Phase 4 — Rework the Marketing page around opening the stall

### UI theme contract

- Reuse the current vendor-portal layout, typography scale, card borders, rounded corners, alert styles, and responsive breakpoints.
- Keep emerald for ordinary operational actions, purple for AI-generated content, and green for approved/share-ready states.
- Use the existing Marketing page card-and-editor layout rather than introducing a new visual style or a separate social-media-looking screen.
- Preserve accessible labels, mobile-friendly controls, and the existing Share dialog pattern.

Keep the existing colour, card, button, dialog, and typography style. Replace only the product-first campaign creation card with:

### Primary card: Open your stall

- Four visible action chips: **We’re open now**, **Opening later**, **Today’s special**, and **Closing soon**.
- A short optional field: **Anything customers should know today?**
- An optional available-item selector shown only for **Today’s special**.
- A single primary button: **Create opening post**.

### Stall marketing profile

- A dedicated settings card for the reusable business facts from Phase 1.
- A clear completion hint that identifies missing recommended fields without blocking a basic post when enough information exists.

### Campaign review

- Show the campaign type instead of forcing a product title.
- Keep the editable caption, call to action, hashtags, preview, approval status, campaign list, and activity history.
- For old product campaigns, continue displaying the product snapshot normally.

**Checkpoint:** The page reads like a daily stall-opening tool, while the UI still feels like Laku Sitok.

### Promotion workspace visual specification

Follow the supplied promotion-workspace reference as the implementation contract.

#### Desktop layout

Use a three-column workspace on wide screens, inside the existing pale blue-grey vendor portal background:

1. **Left: Opening posts**
   - A white, rounded panel headed **OPENING POSTS**.
   - Each saved campaign is a compact card with campaign type, date/time, status chip, and a right arrow.
   - The selected campaign uses an emerald/teal filled card with white text.
   - Unselected cards stay white with a pale blue border.

2. **Centre: Campaign editor**
   - The widest panel; it is the main working area.
   - Show the campaign type as the heading, an optional highlighted item beneath it, and an approval/status chip.
   - Use the same labelled, light-filled form fields shown in the reference for title, caption, call to action, and hashtags.
   - Keep the primary **Share to WhatsApp** button emerald with a share icon.
   - Keep **Copy approved post** as the outlined secondary action beside it.
   - For draft campaigns, show **Save changes** and **Approve for sharing** in the same action area.

3. **Right: WhatsApp preview and campaign activity**
   - Top card: a soft-purple header with a WhatsApp icon and **WHATSAPP STATUS PREVIEW** label.
   - Preview text uses the final approved/draft post format, including hashtags.
   - Bottom card: **CAMPAIGN ACTIVITY**, with a vertically scrollable history of draft-created, approved, and share-opened events.
   - Activity rows show a small status label, event description, and timestamp.

#### Visual details to preserve

- Outer background: the same pale blue-grey used across the vendor portal.
- Panels: white, softly rounded, thin pale-blue border, modest shadow only.
- Selected and primary action colour: emerald/teal.
- AI/generative or preview accent: soft purple header/accent.
- Approval chips: green; draft chips: amber; rejected chips: red.
- Section labels: small, uppercase, navy/blue, with generous letter spacing.
- Form fields: pale tinted surface, rounded corners, small uppercase labels, dark navy values.
- Keep spacing airy and intentionally calm; do not imitate a WhatsApp screen or create a separate visual identity.

#### Responsive behaviour

- On tablet and mobile, stack the workspace in this order: opening-post selector, editor, WhatsApp preview, activity.
- The campaign selector becomes horizontally scrollable or a compact expandable list, never a squeezed unreadable column.
- Keep the WhatsApp share action full-width and easy to tap on a phone.

#### Stall profile split

- Move stable profile fields to **Settings > Stall Profile**: identity/voice, location, hours, and links.
- Keep promotion-specific assets in **Marketing**: selling-point chips, default-hashtag chips, the daily note, campaign type, drafts, preview, and activity.
- Marketing shows a compact **Profile ready** badge and an **Edit stall profile** link; missing location or hours gives a direct Settings link instead of duplicating profile inputs.

## Phase 5 — Approval and WhatsApp Status sharing

Keep the established, phone-tested WhatsApp sharing contract. This is an extension of the current feature, not a replacement:

1. Vendor reviews and saves the draft.
2. Vendor explicitly approves it.
3. The existing themed Share dialog continues to show the WhatsApp option.
4. Selecting it opens `api.whatsapp.com` with the approved assembled post text, exactly as the current phone flow does.
5. On WhatsApp, the vendor chooses **My Status** and completes the post themselves.
6. Laku Sitok records only that the share flow was opened.

Copy-caption remains the desktop fallback. Facebook remains hidden/deferred until there is a separately deployed and tested public share page.

**Checkpoint:** An approved opening announcement can be shared to WhatsApp Status from a phone without copying text first.

## Phase 6 — Test plan

Test these end-to-end flows:

1. Complete profile → `We’re open now` → generate → edit → approve → WhatsApp share.
2. Missing Maps, delivery, and review links → post omits those sections cleanly.
3. `Today’s special` with an available item → optional item fact appears accurately.
4. Unavailable highlighted item → it cannot be selected or is rejected server-side.
5. Malay, English, and mixed-language preferences → no facts are altered.
6. Invalid links and overlong selling points → clear validation errors in the settings card.
7. Existing product campaigns → still list and preview correctly after the migration.
8. A rejected campaign → cannot be shared.
9. A backend restart → campaign drafts and activity remain available because they live in Supabase.

## Demo story

1. Vendor opens Laku Sitok at the start of the day.
2. Selects **We’re open now** and enters a short daily note.
3. Marketing Agent uses the vendor’s approved profile to draft a real opening post.
4. Vendor makes a small edit, approves, and shares it to WhatsApp Status.
5. Judges see that the app helped a small stall become visible without impersonating the vendor or automating social posting.

## Definition of done

- A vendor can enter and update their own reusable stall-marketing profile.
- A vendor can generate a text-only opening announcement without choosing a product.
- Every generated fact comes from vendor-saved data or a deliberately selected available item.
- The vendor can edit and approve every draft.
- WhatsApp sharing is owner-assisted and opens the same approved-text `api.whatsapp.com` flow on a phone.
- The finished page visually belongs to the existing Laku Sitok vendor portal, rather than looking like a separate feature.
- Facebook remains disabled/deferred.
- Existing product campaigns remain readable after the data migration.