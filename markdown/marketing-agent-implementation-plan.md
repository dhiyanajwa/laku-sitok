# Marketing Agent Implementation Plan

## MVP goal

Help a warung create a verified promotion draft and open a ready-to-share WhatsApp Status flow. Owner approval is required before every share. Direct Facebook Page publishing is a later stretch goal.
## Recommended implementation phases

Build this after the live order journey has been migrated and tested. Each phase ends with a small, demoable result, so a Facebook integration issue cannot block the useful parts of the feature.

### Phase 1 — Define the safe promotion rules

- Confirm the eligible-product rule: a product must be available, have a price, and have stock above its reorder level.
- Define supported languages, tones, vendor details, and the default approval mode.
- Confirm that WhatsApp is owner-assisted sharing only; the app must never automate WhatsApp Web or customer broadcasts.
- Decide the initial campaign states: `draft`, `awaiting_approval`, `facebook_published`, `facebook_failed`, and `whatsapp_share_opened`.

**Checkpoint:** The rules and the data that may enter an AI prompt are written down. Customer and order personal data are excluded.

### Phase 2 — Campaign data and protected API

- Add database tables for marketing settings, campaigns, selected campaign items, and campaign activity.
- Scope every record by `vendor_id` and protect vendor routes with the existing authentication middleware.
- Create APIs to list campaigns, create a draft, edit a draft, approve/reject it, and read activity.
- Add server-side validation immediately before every draft save, so product prices, availability, and stock always come from the database.

**Checkpoint:** A logged-in vendor can create, edit, approve, and view a text-only campaign draft without AI or social-media connections.

### Phase 3 — Marketing Agent draft generation

- Add a Marketing Agent that receives verified menu, inventory, and optional sales-summary context from the deterministic agents.
- Use one Qwen call to return structured content: caption, title, call to action, hashtags, selected product, and reason.
- Revalidate the selected product after generation; reject or revise a draft if its price or stock changed.
- Rate-limit generation and record the draft-created event in campaign activity.

**Checkpoint:** The vendor can generate a useful, editable campaign draft grounded in current stock and prices.

### Phase 4 — Vendor marketing workspace

- Add the Marketing page to the vendor portal.
- Show a campaign list, draft editor, product facts, approval status, and activity history.
- Provide Facebook and WhatsApp previews, but begin with text-only posts or an existing product image.
- Add clear actions: `Generate draft`, `Save changes`, `Approve`, `Copy caption`, and `Share`.

**Checkpoint:** A vendor can complete the entire review-and-approval workflow locally, even with no Facebook account connected.

### Phase 5 — WhatsApp owner-assisted sharing

- Add a mobile Share button using the browser/device share sheet.
- Provide a reliable desktop fallback: copy caption and, if an image exists, download or open it.
- Record only `share opened`; never claim that a WhatsApp Status was posted.

**Checkpoint:** The owner can take an approved campaign to WhatsApp themselves, with a graceful fallback when sharing is unavailable.

### Phase 6 — Facebook Page connection and publishing (stretch goal)

- Create the Facebook developer app, configure deployed HTTPS callback URLs, and connect a Page through a backend OAuth flow.
- Keep tokens server-side, encrypted or securely stored; never send them to the frontend or AI model.
- Publish only after a separate explicit `Publish to Facebook` click.
- Save publication IDs, timestamps, failures, and retry attempts in campaign activity.

**Checkpoint:** One approved campaign publishes to the connected demo Page and the dashboard shows the real result.

### Phase 7 — Reliability, demo polish, and release checks

- Test changed price, unavailable product, insufficient stock, edited/rejected draft, expired Facebook connection, and multiple-vendor access.
- Add disconnect and campaign-delete actions, audit history, and sensible generation/publishing limits.
- Prepare a demo storyline: inventory insight → AI-assisted draft → owner approval → share/publish → recorded activity.
- Update the project documentation only with integrations that were actually tested.

**Checkpoint:** The flow is safe, clear to demonstrate, and works even if the external Facebook integration is unavailable.

## 1. Confirm scope and rules

### Supported MVP channels

- **Facebook Page:** supported direct publishing.
- **WhatsApp Status:** owner-assisted sharing only.

### Product rules

- Do not use WhatsApp Web automation or send automated WhatsApp customer broadcasts.
- The owner selects a marketing tone, language, posting hours, and default approval mode.
- A promotion may only use active menu items with a current price and sufficient stock.
- Nothing is published without explicit owner approval.

**Deliverable:** agreed product rules and documented channel limitations.

## 2. Add campaign and settings foundation

Create backend data for the following entities:

- `MarketingSettings` â€” vendor branding, language, Facebook connection, and preferred channels.
- `MarketingCampaign` â€” trigger, draft caption, image, selected items, channels, approval status, and publication status.
- `CampaignActivity` â€” draft created, edited, published, failed, and share opened events.

### Suggested campaign states

```text
draft -> approved -> WhatsApp share opened (recorded as activity)
     -> rejected

Facebook publication states are added only when the Facebook integration phase begins.
```

**Deliverable:** database migration, validation rules, and campaign API contracts.

## 3. Build the Marketing Agent

The agent receives only safe, structured business context:

- Menu item name, price, image, availability, and stock level.
- Vendor name, location, operating hours, and brand tone.
- Optional business insight, such as slow sales or a product to promote.

It produces structured output:

- Caption.
- Call to action.
- Suggested post title.
- Hashtags, when enabled.
- Recommended image or menu item.
- Reason for the suggestion.

Before saving a draft, backend rules verify all prices, stock, and menu items against the current database.

**Deliverable:** `generate campaign draft` and `regenerate caption` actions.

## 4. Create the vendor dashboard experience

Add a Marketing section with:

- Suggested campaigns.
- Draft editor for caption, image, language, and promotion details.
- Facebook preview.
- WhatsApp Status preview.
- Clear campaign status and activity history.

### Primary actions

```text
[Generate draft] [Edit] [Publish to Facebook] [Share to WhatsApp Status]
```

### WhatsApp sharing behaviour

- On mobile, invoke the device share sheet with the campaign image and text.
- On unsupported browsers, provide a fallback to copy the caption and download or share the image.
- Record `share opened`, rather than `posted`, because the application cannot verify that the owner completed a WhatsApp Status post.

**Deliverable:** usable owner review-and-publish flow.

## 5. Integrate Facebook publishing

- Let the owner connect a Facebook account and select their Page.
- Store access credentials securely; never expose them to the Marketing Agent or browser.
- Publish only after an explicit owner action.
- Save the Facebook post ID, publication time, and error details.
- Add retry handling for temporary failures and expired authorization.

**Deliverable:** one approved campaign can publish successfully to a Facebook Page.

## 6. Safety, reliability, and access controls

- Confirm vendor ownership for every campaign and social connection.
- Keep an audit trail of generated and published content.
- Exclude customer names, phone numbers, orders, and private sales data from post drafts.
- Add rate limits so the agent cannot flood suggestions or posts.
- Allow the owner to disconnect Facebook and delete saved campaign drafts.

**Deliverable:** safeguards appropriate for production use.

## 7. Test and release gradually

Test the following:

- Draft generation with unavailable, out-of-stock, and changed-price items.
- Owner edits and rejected drafts.
- Facebook success, permission errors, expired tokens, and retry behaviour.
- WhatsApp sharing on Android and iPhone, plus the desktop fallback.
- Multiple vendors with separated data and social connections.

### Release order

1. Internal or demo vendor with manual draft generation.
2. Owner-approved Facebook publishing.
3. WhatsApp Status share button.
4. Optional automatic campaign suggestions based on inventory and sales insights.
5. Instagram integration as a later phase.

## Definition of done

- A vendor can create or receive a suggestion for a promotion.
- The draft uses verified product data.
- The vendor can edit and approve it.
- The campaign publishes to their Facebook Page successfully.
- The vendor can open a WhatsApp Status-ready share flow.
- Campaign activity and failures are visible in the dashboard.
- No content is posted without explicit owner approval.


