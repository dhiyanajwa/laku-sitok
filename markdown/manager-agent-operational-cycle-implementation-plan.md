# Manager Agent Operational Cycle — Implementation Plan

## Goal

Give the vendor one safe place to understand daily operations and carry out a small, confirmed set of actions:

```text
restock → sell → prepare → complete → review → restock better
```

The Manager Agent coordinates existing deterministic services. It does not replace them and it does not allow an AI model to directly modify data.

## Guardrails

- The Kitchen workflow is the source of truth for order states.
- Inventory and ingredient services are the source of truth for stock movements.
- Every data-changing Manager action is proposed first, confirmed by the vendor, then revalidated on the backend before it is saved.
- Qwen is used only to explain trusted summaries and make recommendations. It never decides IDs, quantities, status changes, or database writes.
- Unsupported requests must receive a helpful fallback; the Manager must never claim a change was made when it was not.

## Existing foundation

- Vendor authentication and vendor-scoped backend routes exist.
- Ready-item and ingredient stock are tracked in Supabase.
- Kitchen transitions are enforced: `Pending → Preparing → Ready → Completed`; Pending and Preparing can be cancelled.
- Completing a Ready order deducts stock atomically.
- Analytics, low-stock summaries, availability calculations, and the Qwen Business Advisor already exist.

## Delivery sequence

### Phase 0 — Kitchen workflow safety (completed)

The Manager must not be able to bypass kitchen rules.

- Backend transition map rejects invalid or repeated order changes.
- Completion continues through `complete_order_with_stock`.
- Kitchen and Orders screens show only valid next actions.
- Stale order updates fail safely instead of overwriting another session.

**Exit check:** a completed or cancelled order cannot be moved again; an order cannot skip from Pending to Completed.

### Phase 1 — Manager foundation and structured request API

Build a real Manager endpoint without allowing free-form actions yet.

**Backend**

- Add `POST /api/manager/request`, protected by `requireVendor`.
- Request shape:

  ```json
  { "message": "What needs my attention?" }
  ```

- Return one structured response type:

  ```json
  {
    "data": {
      "type": "information",
      "title": "What needs attention",
      "message": "Two orders need attention and one ingredient is low.",
      "details": []
    }
  }
  ```

- Support a deliberately small deterministic intent list:
  - `attention_summary`
  - `delayed_orders`
  - `daily_summary`
  - `restock_preview`
  - `kitchen_status_preview`
- Unsupported messages return a clear list of supported tasks. Do not use Qwen to execute or classify actions in this phase.

**Agent design**

- Add a Manager orchestration service/agent that calls existing Order, Kitchen, Ingredient/Inventory, and Business Intelligence services.
- Keep specialist services as the only place that performs domain calculations.

**Exit check:** authenticated vendors can ask for a trusted summary without changing database data.

### Phase 2 — Deterministic attention summary

Make “What needs my attention?” useful before introducing any write action.

**Backend summary fields**

- Delayed Pending and Preparing orders: order number, current status, elapsed minutes, item summary.
- Low ready-item stock.
- Low ingredient stock.
- Recipe menu items with `0 can still be made` or incomplete recipes.
- Optional today summary: completed order count and revenue.

**Configuration**

- Add `ORDER_DELAY_MINUTES=15` to `backend/.env.example`.
- Default to 15 when the value is missing or invalid.
- Calculate delays in the backend, not only in the frontend, so the Manager and Kitchen agree.

**UI**

- Display attention sections/cards in the Manager response.
- Add links to Kitchen or Inventory where useful; do not auto-navigate or change data.

**Exit check:** the Manager and Kitchen report the same delayed orders at the same threshold.

### Phase 3 — Ingredient restock preview

Prepare stock-delivery actions but do not save them yet.

**Supported request**

```text
We received 20 burger buns.
```

**Behaviour**

1. Parse only a constrained restock format: positive quantity plus ingredient name.
2. Match the name against this vendor's ingredients only.
3. If exactly one match exists, calculate current quantity and proposed quantity.
4. If no match or multiple matches exist, ask the vendor to choose an ingredient from a list.
5. Return a `proposed_action` response but do not change stock.

**Response example**

```json
{
  "type": "proposed_action",
  "actionType": "ingredient_restock",
  "summary": "Add 20 pieces to Burger bun?",
  "preview": { "currentQuantity": 12, "changeQuantity": 20, "nextQuantity": 32 }
}
```

**Implementation boundary**

- Add an Inventory Agent wrapper for the existing `adjustIngredient` service with `reason: 'restock'`.
- Do not add a second stock-update implementation.
- Ready-item restocking can be a later action type; ingredient restocking is the first Manager stock action.

**Exit check:** the Manager can prepare an exact restock preview and cannot yet save it.

### Phase 4 — Server-side confirmation and action execution

Turn safe previews into actions that the vendor explicitly confirms.

**Database migration**

Create `manager_actions` with at least:

- `id` UUID
- `vendor_id`
- `original_request`
- `action_type` (`ingredient_restock`, `order_status`)
- `payload` JSONB containing IDs and proposed values
- `status` (`pending_confirmation`, `confirmed`, `cancelled`, `expired`, `failed`)
- `expires_at`, `confirmed_at`, `completed_at`
- `result` JSONB and `failure_reason`
- timestamps

Use RLS and service-role-only mutation, following the existing backend pattern.

**Endpoints**

- `POST /api/manager/actions/:id/confirm`
- `POST /api/manager/actions/:id/cancel`

**Confirmation rules**

1. Proposals expire after a short period, for example 10 minutes.
2. Confirmation loads the proposal by ID and vendor ID.
3. Backend rechecks the target before mutation:
   - ingredient still belongs to the vendor;
   - restock amount is still positive;
   - order still belongs to the vendor and the requested transition is still valid.
4. Only then call the existing specialist service.
5. Record success or failure; a proposal cannot execute twice.

**First executable actions**

- Confirm an ingredient restock.
- Confirm `Pending → Preparing`, `Preparing → Ready`, or `Ready → Completed`.

**Exit check:** double-clicking Confirm or retrying an old proposal cannot duplicate stock or repeat completion.

### Phase 5 — Persistent audit trail

Make Manager actions reviewable after a restart.

- Use `manager_actions` as the vendor-visible action history.
- Add `GET /api/manager/actions` with vendor scoping and a sensible limit.
- Record each lifecycle state: proposed, confirmed, cancelled, expired, completed, or failed.
- Keep the existing in-memory Agent Activity panel for live demo feedback, but do not treat it as durable history.

**UI**

- Show recent Manager actions in the drawer: timestamp, request, proposal, outcome, and failure reason where relevant.

**Exit check:** a backend restart does not erase confirmed Manager actions.

### Phase 6 — Dashboard Manager drawer

Expose the completed safe workflow without forcing the vendor away from the dashboard.

**UI**

- Add a dashboard-level **Ask Manager** button.
- Open a drawer/modal with suggested prompts:
  - What needs my attention?
  - Which orders are delayed?
  - We received stock.
  - How did we do today?
- Render information, recommendations, and confirmation cards distinctly.
- Confirmation cards have **Confirm** and **Cancel** and display exact affected items/orders and values.

**MVP conversation scope**

- Keep messages in current browser-session state only.
- Do not build a long-term chat transcript yet; persistent action history already preserves important outcomes.

**Exit check:** a vendor can inspect attention, preview a restock, confirm it, and see the durable result without leaving the dashboard.

### Phase 7 — Qwen-powered read-only recommendations

Add language help only after the deterministic action path works.

- Daily performance questions use the current Business Intelligence and Inventory summaries.
- The Business Advisor/Qwen turns those trusted numbers into a concise practical recommendation.
- The Manager displays the recommendation as `recommendation`; it never turns it into an automatic action.
- Include source facts such as low stock, completed-order count, or best seller alongside the advice.

**Exit check:** “How did we do today?” gives an explainable recommendation, while no stock, order, or settings data is modified.

## Non-goals for this MVP

- No unrestricted autonomous agent.
- No background worker, push notification, or continuous server-side monitoring; refresh/dashboard polling is sufficient.
- No automatic restocking, menu availability changes, order-status updates, or social posts.
- No persistent general chat history.
- No Qwen-powered direct database actions or unbounded natural-language command parsing.

## End-to-end demo

1. Vendor opens **Ask Manager** and asks, “What needs my attention?”
2. Manager reports one delayed order and low Burger bun stock.
3. Vendor says, “We received 20 burger buns.”
4. Manager shows the exact quantity change and requires confirmation.
5. Vendor confirms; the ingredient movement is stored and audit history updates.
6. Vendor asks, “Order LS-1042 is ready.”
7. Manager proposes the valid status transition; vendor confirms.
8. At closing, vendor asks, “How did we do today?” and receives a Qwen-written recommendation grounded in trusted business facts.

## Success criteria

- Every Manager data change is vendor-scoped, explicitly confirmed, revalidated, and traceable.
- The Manager never bypasses kitchen or stock business rules.
- The vendor can complete the restock → kitchen → review cycle from one understandable dashboard control.