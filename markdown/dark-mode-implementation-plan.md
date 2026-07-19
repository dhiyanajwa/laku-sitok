# Dark Mode Implementation Plan

## Goal

Give vendors a polished dark-mode option that feels like Laku Sitok rather than a colour-inverted version of the existing portal. The choice must be easy to find, persist on the same device, and keep every operational state readable: orders, kitchen, stock, AI advice, marketing, forms, alerts, and campaign previews.

## Recommended MVP scope

Ship dark mode for the authenticated **Vendor Portal** first:

- Dashboard, Orders, Kitchen, Inventory, AI Advisor, Marketing, and Settings.
- Vendor login screen and shared vendor controls.
- The vendor navigation, drawers, dialogs, alerts, form fields, tables, status chips, and buttons.

Keep the public customer menu, customer order tracking, and welcome page light in this first release. Those screens are customer-facing and should receive their own small visual review later rather than inheriting a vendor-focused dark theme by accident.

No database migration or backend change is required. Theme preference is a browser preference, not business data.

## User experience

```text
Vendor opens the portal
        ↓
Sees a light/dark button in the top bar
        ↓
Chooses Dark mode
        ↓
Entire vendor portal changes immediately
        ↓
Choice is remembered after refresh and the next visit
```

First visit behaviour:

1. Use the device's light/dark preference when it is available.
2. Otherwise start in the current light theme.
3. Once the vendor taps the button, their explicit choice always wins for that browser.

## Design contract

Dark mode remains recognisably Laku Sitok:

- Deep navy/slate page backgrounds, not pure black.
- Slightly lighter navy surfaces for cards, drawers, dialogs, and input fields.
- High-contrast off-white text with muted blue-grey secondary text.
- Keep emerald for primary operational actions, purple for AI-related accents, and the existing green/amber/red meaning for status chips.
- Use subtle borders and restrained shadows so the hierarchy remains visible without bright outlines.
- Preserve the current rounded cards, typography, spacing, and calm airy layout.

The mode must never rely on colour alone. Status chips keep their labels, alerts keep their icons and text, and focused controls remain clearly outlined.

## Phase 1 — Theme foundations

Create a single theme source that defines both `light` and `dark` palettes.

- Extend the current MUI `createTheme` setup with palette modes, semantic background surfaces, text, divider, action, success, warning, error, and info colours.
- Define a small set of Laku Sitok semantic tokens such as page background, elevated surface, muted surface, primary text, secondary text, border, AI accent, and selected navigation state.
- Set component defaults for MUI cards, app bars, drawers, outlined inputs, dialogs, buttons, alerts, tabs, tables, chips, and tooltips.
- Keep the existing font, border radius, and emerald primary brand colour.

**Checkpoint:** Switching the MUI palette from light to dark produces a coherent base interface before page-specific colour changes begin.

## Phase 2 — Persisted theme control

Introduce a small `ThemeModeProvider` around the app's existing MUI theme provider.

- Store the choice in `localStorage` under a clear key such as `laku_sitok_theme_mode`.
- Read the preference before rendering the main portal where possible, using `prefers-color-scheme` only for a vendor who has never chosen a mode.
- Expose `mode` and `toggleMode` to the vendor layout.
- Add a compact icon button to the top app bar, near the sound and notification controls:
  - Light mode: moon icon and accessible label **Switch to dark mode**.
  - Dark mode: sun icon and accessible label **Switch to light mode**.
  - Add a tooltip so the purpose is obvious on desktop and mobile.
- Do not make the button a server setting in the MVP; each device can choose the mode it needs.

**Checkpoint:** A vendor can toggle the mode, refresh, and return in the same mode without affecting other vendors or public screens.

## Phase 3 — Convert the shared shell first

Replace hard-coded colours in the shared Vendor Layout before touching individual pages.

- Sidebar, brand block, navigation hover/active states, user footer, app bar, dividers, main-page background, sound control, customer-menu button, notification button, and mobile drawer.
- Add sun and moon paths to the existing `VendorIcon` component so the control matches the current custom icon style.
- Replace literal surface, text, border, and selected-state colours with theme palette values or the semantic tokens from Phase 1.

**Checkpoint:** Navigation, the top bar, drawers, and an empty route look complete in both modes.

## Phase 4 — Convert portal pages in operational order

Migrate pages one group at a time, checking light mode after every group so neither theme regresses.

1. **Core operations:** Dashboard, Orders, Kitchen, and Inventory.
   - Tables, order cards, KDS states, stock warnings, tabs, empty states, recipe panels, and management dialogs.
2. **AI workflow:** AI Advisor, Agent Activity panel, manager drawer, prompts, recommendations, and activity filters.
   - Keep purple AI surfaces calm and readable against dark card backgrounds.
3. **Marketing workflow:** Marketing page, marketing tag fields, campaign editor, WhatsApp preview, campaign activity, and share dialog.
   - Preserve emerald approval/share states and the soft-purple preview header while ensuring its copy passes contrast checks.
4. **Setup workflow:** Settings, Login, menu-item creation, recipe setup, ingredient forms, and validation alerts.

As each component is migrated, replace only visual literals with semantic theme tokens; do not alter its API, business logic, Supabase calls, or order flows.

**Checkpoint:** Every vendor route is usable in both themes, including all main dialogs and forms.

## Phase 5 — Accessibility and visual quality checks

Test both modes at desktop and phone widths.

- Text, icons, chips, input labels, placeholders, and alert messages meet practical WCAG AA contrast targets.
- Keyboard focus is visible on buttons, navigation, fields, chips, dialogs, and the mode toggle.
- Disabled, loading, hover, selected, and error states remain distinguishable.
- Long campaign captions, ingredient lists, kitchen tickets, and table rows do not lose hierarchy in dark mode.
- Browser refresh causes no obvious light-theme flash after the user has saved a dark preference.
- The public customer menu remains intentionally light and fully unchanged in this MVP.

**Checkpoint:** A vendor can complete an order, update kitchen status, adjust inventory, ask the advisor, create a campaign, and share to WhatsApp while in dark mode.

## Phase 6 — Optional public-mode expansion

Only after the vendor release is stable, decide whether the public customer menu and order tracking should also offer dark mode.

- Use the same foundation, but review product cards, checkout/cart drawer, QR/menu visuals, and tracking timeline as a customer experience.
- Keep the customer mode independent from the vendor portal preference unless there is a clear reason to unify them.
- Do not block the vendor dark-mode release on this phase.

## Definition of done

- A clear top-bar dark-mode button works on desktop and mobile.
- Theme preference persists in the browser and honours the device preference only before a manual choice.
- All Vendor Portal routes and their common pop-ups look intentional and remain accessible in light and dark modes.
- Laku Sitok's emerald operational actions, purple AI cues, and status meanings are preserved.
- No operational data, authentication, marketing sharing, order flow, or Supabase schema changes are required.
- Public customer screens stay light until their separate review is approved.

## Recommended build order

Implement Phases 1 and 2 together, then complete Phase 3 before opening page-level work. After that, test one operational page group at a time in both modes. This keeps every step demonstrable and avoids leaving the navigation or primary actions visually mismatched while pages are being converted.
