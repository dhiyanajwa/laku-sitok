# Laku Sitok API

Development base URL: `http://localhost:5000/api`

Successful responses use `{ "data": ... }`. Error responses use `message` and `status`.

## Public Endpoints

- `GET /health` — API health check
- `GET /health/database` — Supabase connection check
- `GET /products` — available menu products with inventory
- `POST /orders` — creates an order and atomically reduces stock

## Vendor-Protected Endpoints

These require a Supabase access token in `Authorization: Bearer <token>`.

- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `GET /inventory`
- `PATCH /inventory/:productId`
- `GET /orders?status=pending`
- `PATCH /orders/:id/status`
- `GET /analytics/overview`

`GET /analytics/overview` returns completed-order metrics: today's revenue and count, overall revenue and profit, best seller, seven-day sales totals, and low-stock items.

## AI Advisor Endpoint

`POST /advisor/ask` is vendor-protected and uses Qwen with the model configured in `QWEN_MODEL`.
## Manager Agent Endpoints

All Manager endpoints are vendor-protected.

- `GET /manager/context` — returns the shared kitchen delay threshold.
- `POST /manager/request` — handles a supported operational request. It returns an `information`, `recommendation`, or `proposed_action` response.
- `GET /manager/actions` — returns the vendor's recent durable Manager actions.
- `POST /manager/actions/:id/confirm` — revalidates and executes a pending action once.
- `POST /manager/actions/:id/cancel` — cancels a pending action without changing business data.

Supported MVP requests include attention summaries, delayed orders, exact ingredient-restock requests, valid kitchen-status proposals, and daily business review. Qwen is used only for the daily read-only recommendation.
