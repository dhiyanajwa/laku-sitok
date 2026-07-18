# Can Still Make — Ingredient Stock MVP Plan

## MVP goal

Help a vendor see how many servings of one made-to-order menu item can still be prepared, explain the limiting ingredient, and keep that estimate accurate when the kitchen completes an order.

The hackathon demonstration item is **Burger Special**. Existing menu items continue to use the current ready-to-sell item inventory.

## The demo story

> Burger Special needs a bun, patty, egg, cheese slice, and wrapper. Cheese is the limiting ingredient, so Laku Sitok shows that the vendor can still make 8 Burger Specials. When the kitchen completes one mixed ramen-and-burger order, ramen decreases from 10 to 9, every burger ingredient decreases by one serving, and Burger Special becomes 7 available.

This calculation is deterministic. AI may later explain the result, but it must never invent quantities or deduct stock.

## MVP operating model

### Two stock modes only

| Stock mode | Used for | Completion effect |
| --- | --- | --- |
| `ready_item` | Existing premade products, drinks, ramen, nasi lemak packets | Deduct the product's existing `inventory.quantity`. |
| `ingredient_recipe` | Burger Special | Deduct every ingredient in its saved recipe. |

All existing products default to `ready_item`. `untracked` is deferred; the existing `is_available` switch is enough for the MVP.

### Availability formula

For an ingredient-recipe product:

```text
servings supported by one ingredient = floor(ingredient quantity / recipe quantity per serving)
estimated servings left = the lowest supported servings across required ingredients
```

Example:

```text
Burger Special recipe: 1 bun, 1 patty, 1 egg, 1 cheese slice, 1 wrapper
Cheese available: 8 slices
Estimated Burger Special availability: 8
Limiting ingredient: cheese
```

If the Burger Special recipe is missing or incomplete, Laku Sitok must show that setup is incomplete. It must not invent an availability number or block the vendor from selling the item.

### Stock timing

- Creating a pending order does not deduct either item or ingredient stock.
- Only the Kitchen transition to `completed` changes stock.
- Completion performs one locked database transaction.
- A failed stock check rolls back every deduction and leaves the order in its previous status.

The MVP intentionally has no stock reservation. Multiple pending orders may request the same stock; the final check happens when the vendor completes the order.

## MVP data design

Create one timestamped SQL migration and mirror the final definitions in `database/schema.sql`.

### 1. Product stock mode

Add `stock_mode` to `products`:

```text
ready_item | ingredient_recipe
```

- Default all existing products to `ready_item`.
- The current `inventory` table remains the source of truth for ready items.
- Burger Special is seeded as `ingredient_recipe`.

### 2. Ingredients

Add an `ingredients` table:

```text
id, vendor_id, name, quantity, unit, reorder_level, updated_at
```

Rules:

- `quantity` and `reorder_level` are non-negative decimals.
- `unit` is a vendor-friendly label such as `pieces`, `slices`, `servings`, `g`, or `kg`.
- Ingredient names are unique per vendor.
- The MVP seeds only the ingredients needed for Burger Special.

### 3. Recipe rows

Add `product_recipe_ingredients`:

```text
id, product_id, ingredient_id, quantity_per_serving
```

Rules:

- One positive recipe quantity for each product/ingredient pair.
- The product and ingredient must belong to the same vendor.
- Burger Special needs at least one saved recipe row before it receives a calculated estimate.

### 4. Minimal stock movement audit

Add `ingredient_stock_movements` for ingredient changes made by a completed order, restock, or manual adjustment:

```text
vendor_id, ingredient_id, change_quantity, reason, order_id, created_at
```

Reasons for the MVP:

```text
completed_order | manual_adjustment | restock
```

Ready-item movement history is deferred. Existing product inventory remains fully functional.

## Backend delivery plan

### Phase 1 — Database and demo data

- Add the two stock modes, ingredients, recipe rows, and minimal ingredient movement table.
- Seed one Burger Special recipe and the demo ingredient quantities.
- Keep existing products and existing ready-item inventory working unchanged.

**Checkpoint:** Burger Special has a saved recipe. Existing menu and orders still load.

### Phase 2 — Ingredient management and availability

Extend the inventory module with vendor-protected endpoints for:

- list, create, edit, restock, and manually adjust ingredients;
- read and replace Burger Special recipe rows;
- read calculated recipe availability and limiting ingredients.

Create one backend availability calculator. It returns:

```text
productId, estimatedAvailable, limitingIngredients, recipeComplete, lastUpdated
```

The backend, not the frontend, owns this calculation.

**Checkpoint:** The vendor can see: `Burger Special: 8 can still be made — limited by cheese.`

### Phase 3 — Atomic completed-order deduction

Replace immediate deduction in `database/order-transaction.sql` and `database/order-tracking.sql`:

- `create_order` creates the pending order and line items without changing stock.
- Add `complete_order_with_stock` as a database transaction.
- Aggregate all requirements across the full order before validation.
- Lock ready-item inventory and ingredient rows in a consistent ID order.
- Deduct ready-item inventory for `ready_item` products.
- Deduct each Burger Special ingredient for `ingredient_recipe` products.
- Insert ingredient movement records.
- Mark the order `completed` only after all deductions succeed.
- Reject insufficient stock without changing the order or any stock row.

Update `kitchen.agent.js` so only the transition to `completed` calls this transaction. Pending, preparing, ready, and cancelled remain simple status updates.

**Checkpoint:** Completing a mixed ramen-and-burger order changes both stock types once, atomically.

### Phase 4 — Customer, kitchen, and dashboard integration

- Customer menu consumes backend `availableQuantity`.
- Burger Special is disabled only when calculated availability is zero.
- The customer sees only `Unavailable`; no recipe details are exposed.
- Kitchen shows a clear completion error when an ingredient is insufficient.
- Dashboard adds a compact `Can still make` card with the Burger Special estimate and limiting ingredient.

**Checkpoint:** The full customer-to-kitchen demo visibly changes Burger Special from 8 to 7 after a completed order.

### Phase 5 — Demo polish and documentation

- Test mobile inventory and kitchen screens.
- Add one concise Agent Activity event when completion updates ingredient stock.
- Update `README.md`, `FEATURES.md`, `ROADMAP.md`, `DATABASE.md`, and `API.md` only with completed behaviour.

**Checkpoint:** The feature has a repeatable demo script and clear documentation.

## MVP test plan

### Availability

- Burger Special estimates 8 servings with 8 cheese slices and enough of every other required ingredient.
- The response identifies cheese as the limiting ingredient.
- A missing or incomplete recipe returns `recipeComplete: false` with no invented availability.
- Ingredient quantities accept positive decimals; ready-item quantities remain whole numbers.

### Order completion

- Creating a pending order does not change item or ingredient stock.
- Completing one ready-item ramen order changes only ramen item inventory.
- Completing one Burger Special deducts bun, patty, egg, cheese, and wrapper once.
- Completing one mixed ramen-and-burger order changes both inventory types.
- Completing the same order twice never deducts twice.
- Cancelling an order does not deduct stock.
- Insufficient cheese causes the whole completion to fail with no partial stock changes.

### Access and demo

- A vendor cannot read or edit another vendor's ingredients or recipes.
- The customer menu never exposes ingredient names or quantities.
- Demo sequence: Burger Special is 8 available → complete one order → Burger Special is 7 available.

## Deferred after the MVP

These features remain part of the product vision, but do not block the hackathon demonstration:

- `untracked` stock mode.
- Owner confirmation: `Yes, correct`.
- Daily owner availability overrides and their expiry/reduction rules.
- Full ready-item movement audit.
- Recipes for every menu product.
- Recipe editor polish for all products.
- Supplier orders, expiry dates, waste, batch production, and barcode scanning.
- AI explanations and recommendations based on ingredient availability.
- Automatic recipe learning or automatic stock corrections.

## Explicit non-goals for the hackathon MVP

- Stock reservations at checkout.
- AI deciding quantities, changing recipes, or deducting stock.
- Automatic WhatsApp/Facebook promotion based on ingredient stock.
- Automatic supplier ordering.