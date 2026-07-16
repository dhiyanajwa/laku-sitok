# Laku Sitok Project Specification

## Vision

Help micro entrepreneurs run their businesses with reliable ordering, inventory data, analytics, and practical AI advice.

## Current Solution

Laku Sitok records customer orders, updates stock transactionally, and gives vendors a protected dashboard for kitchen operations and business analytics.

## Users

### Customer

- Browse the menu through a QR link
- Add products to a cart
- Place an order and receive confirmation

### Business Owner

- Sign in to the vendor portal
- Manage products, stock, orders, and kitchen statuses
- Review revenue, profit, best sellers, and low-stock alerts
- Use the planned AI Business Advisor

## Planned AI Advisor

The Phase 7 advisor will use OpenRouter with `poolside/laguna-m.1:free`. The backend will send only a compact analytics and inventory summary; customer names and API keys are never sent to the frontend.
