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

## Planned Advisor Endpoint

Phase 7 will add a vendor-protected advisor endpoint backed by OpenRouter with `poolside/laguna-m.1:free`.
