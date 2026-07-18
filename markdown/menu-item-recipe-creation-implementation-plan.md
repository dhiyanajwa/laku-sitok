# Menu Item and Recipe Creation Flow — Implementation Plan

## Goal

Let a vendor create either:

- a **ready item**, whose available stock is a finished-item quantity; or
- a **made-from-ingredients item**, whose availability is calculated from its saved recipe and ingredient stock.

The flow must save the menu item, any inline ingredients, and recipe rows together. A failed save must not leave an incomplete product or orphan ingredients.

## Existing capabilities to reuse

The ingredient-stock MVP already provides the core business rules:

- `products.stock_mode` supports `ready_item` and `ingredient_recipe`.
- `ingredients` holds the current quantity, unit, and reorder level.
- `product_recipe_ingredients` stores the per-serving recipe.
- `availability.service.js` calculates `estimatedAvailable` and limiting ingredients.
- `complete_order_with_stock` deducts ready-item inventory or every recipe ingredient only when the kitchen completes an order.

This delivery adds the product-setup experience and makes recipe management work for every recipe product, not only the seeded Burger Special.

## Agreed product rules

| Choice | Required at creation | Source of availability | Completion behaviour |
| --- | --- | --- | --- |
| Ready item | Finished-item quantity and reorder level | `inventory.quantity` | Deduct finished-item quantity. |
| Made from ingredients | At least one complete recipe row | Lowest supported servings across its ingredients | Deduct every recipe ingredient. |

### Validation rules

- Product name, category, selling price, and cost price are required.
- Ready-item quantity and reorder level are non-negative whole numbers.
- Ingredient quantity, ingredient reorder level, and quantity per serving are non-negative decimals; recipe quantity must be greater than zero.
- A recipe row is either an existing ingredient or one new inline ingredient — never both.
- The same ingredient cannot be selected twice in one recipe.
- A made-from-ingredients item needs at least one valid recipe row.
- A ready item cannot submit recipe rows.
- Ingredient units are stored on the ingredient and displayed next to the recipe quantity; the recipe row does not define a second unit.
- For this release, stock mode is selected when the item is created and cannot be changed in the ordinary edit form. Changing stock mode later needs a deliberate conversion flow.

## User experience

### New vendor page: Menu items

Add **Menu items** to the vendor navigation and create `/vendor/menu-items`.

The page contains a list of the vendor's products and an **Add menu item** button. Each item displays its stock method and either finished stock or the calculated “Can still make” value.

### Add menu item form

1. **Item details** — name, category, description, selling price, and cost price.
2. **Stock method** — two clear selectable cards:
   - **Ready item** reveals quantity and reorder level.
   - **Made from ingredients** reveals the recipe builder.
3. **Recipe builder** (ingredient option only):
   - Each row starts with an existing-ingredient selector and a quantity-per-serving input.
   - **+ New ingredient** changes that row to an inline form: name, current stock, unit, reorder level, and quantity per serving.
   - Show the stored unit beside the quantity-per-serving input, for example `50 g` or `1 slice`.
   - Allow adding and removing rows; prevent a duplicate selected ingredient before submission.
4. **Save menu item** — show the resulting availability and limiting ingredient after successful creation.

An inline ingredient remains only in the form draft until the vendor saves. Cancelling the form creates nothing.

### Inventory page follow-up

Keep **Inventory** for ongoing stock maintenance, but remove its Burger Special assumptions:

- Replace `recipeProducts[0]` with a recipe-product selector.
- Load and edit the selected product's recipe.
- Replace all Burger Special-specific copy with the selected product name.
- Keep Ingredients as the place to restock, adjust, and edit ingredient details.

## Backend and database design

### One atomic setup operation

The browser must not call `POST /ingredients`, `POST /products`, and `PUT /recipes/:id` sequentially. Those requests can leave partial data if one fails.

Add a PostgreSQL RPC, for example `create_product_with_setup`, that runs in one transaction and does all of the following:

1. Validates the product fields and requested stock mode.
2. Creates the product under the authenticated vendor.
3. Creates an `inventory` row.
   - For a ready item, use the submitted quantity and reorder level.
   - For a recipe item, create a zero-value row only to preserve the current product/inventory shape; it is never used for availability.
4. For a recipe item, validates every row, confirms existing ingredients belong to the same vendor, and inserts any inline ingredients.
5. Inserts the recipe rows using the resolved ingredient IDs.
6. Returns the new product ID. If any validation or insert fails, PostgreSQL rolls back everything.

The function must reject duplicate ingredients after resolving inline ingredients. It should also reject a new inline ingredient whose name already belongs to the vendor, and guide the UI to choose the existing record instead.

### Product endpoint contract

Retain `POST /api/products`, but extend its request body:

```json
{
  "name": "Chicken Burger",
  "category": "Meals",
  "description": "Optional",
  "price": 9.5,
  "costPrice": 4.3,
  "stockMode": "ingredient_recipe",
  "recipe": [
    { "ingredientId": "existing-ingredient-uuid", "quantityPerServing": 1 },
    {
      "newIngredient": {
        "name": "Burger sauce",
        "quantity": 750,
        "unit": "g",
        "reorderLevel": 150
      },
      "quantityPerServing": 30
    }
  ]
}
```

For a ready item, send `quantity` and `reorderLevel`; omit `recipe`.

After the RPC succeeds, `product.service.js` loads and returns the standard product shape with availability. The response should include the calculated availability for recipe products, so the form can immediately confirm “Can still make: X”.

### Recipe replacement hardening

Update the existing recipe-save path to use a transaction-safe RPC rather than deleting rows and inserting replacements in separate requests. It must:

- accept only `ingredient_recipe` products;
- validate the complete replacement recipe before deleting the old rows;
- verify vendor ownership and duplicate ingredients; and
- return the new recipe plus recalculated availability.

### Files expected to change

| Area | Files |
| --- | --- |
| Database | New timestamped SQL migration; mirror final definitions in `database/schema.sql` if it is maintained. |
| Product creation | `backend/services/product.service.js`, `backend/controllers/product.controller.js`, and the product route only if a separate setup route is chosen. |
| Recipe safety | `backend/services/ingredient.service.js` and its SQL RPC. |
| API client | `frontend/src/services/api.js`. |
| Vendor UI | New `frontend/src/pages/vendor/MenuItemsPage.jsx`; `frontend/src/App.jsx`; `frontend/src/components/VendorLayout.jsx`; update `frontend/src/pages/vendor/InventoryPage.jsx`. |
| Documentation | `API.md`, `DATABASE.md`, `FEATURES.md`, and the README only after the feature is complete. |

## Delivery phases

### Phase 1 — Database transaction and validation

- Add `create_product_with_setup` and a transaction-safe recipe replacement RPC.
- Add constraints and error messages for stock mode, recipe completeness, ownership, duplicate ingredients, and numeric values.
- Update the product service to call the setup RPC for both stock modes.

**Checkpoint:** Creating a recipe product with a new ingredient succeeds as one transaction; an invalid recipe creates neither product nor ingredient.

### Phase 2 — Product creation API

- Extend `POST /api/products` to accept ready-item or recipe setup payloads.
- Preserve the current product response shape and include availability for recipe products.
- Reject stock-mode changes through the ordinary patch endpoint.

**Checkpoint:** API clients can create a ready item and a multi-ingredient item with clear validation failures.

### Phase 3 — Vendor menu-item screen

- Add the Menu items navigation entry, route, product list, and add form.
- Build the stock-method choice, ready-item fields, and dynamic recipe rows.
- Load existing ingredients for the dropdown and keep new ingredients in local draft state until save.
- Show success, duplicate, and incomplete-recipe messages in plain vendor language.

**Checkpoint:** A vendor can add a burger with existing ingredients and a new sauce without visiting Inventory first.

### Phase 4 — Generalize recipe maintenance

- Update Inventory to select any recipe product rather than the first one.
- Use the safe replacement endpoint when editing recipes.
- Refresh the availability card after a recipe or ingredient change.

**Checkpoint:** Two recipe products can be independently viewed and edited, each with its own “Can still make” result.

### Phase 5 — End-to-end regression and documentation

- Confirm customer menu availability works for newly created recipe products.
- Confirm Kitchen completion deducts each newly configured recipe correctly.
- Update user-facing documentation and demonstrate both stock methods.

**Checkpoint:** A newly created recipe item appears in the customer menu, then its availability decreases after a completed order.

## Acceptance tests

### Creation

- A ready item saves with its specified finished-item stock and appears in Inventory > Items.
- A made-from-ingredients item cannot save without at least one valid recipe row.
- An inline ingredient is not created when the form is cancelled or when another field makes submission invalid.
- A successful recipe-item save creates the product, its inline ingredients, inventory placeholder, and recipe rows together.
- Selecting the same ingredient twice produces a clear validation error.

### Availability and stock

- Availability uses the lowest `floor(ingredient quantity / quantity per serving)` result.
- The result identifies all tied limiting ingredients.
- A product with insufficient ingredient stock is unavailable to customers.
- Completing an order deducts the required amount from each ingredient exactly once.
- A failed completion leaves every ingredient, item stock record, and order status unchanged.

### Access and regression

- A vendor cannot select another vendor's ingredient ID or view another vendor's recipe.
- Existing ready items continue to use only finished-item inventory.
- Existing seeded Burger Special recipe still loads and can be edited.
- Customer-facing pages never expose ingredient quantities or recipe details.

## Out of scope for this release

- Changing a product between ready-item and recipe stock modes after creation.
- Batch recipes, yields, sub-recipes, ingredient cost roll-ups, waste, expiry dates, or supplier purchasing.
- Stock reservations during checkout.
- AI-generated recipes or AI-led stock deductions.
