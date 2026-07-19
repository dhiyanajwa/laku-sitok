# Laku Sitok Development Roadmap

## Completed Phases

### Phase 1 — Project Setup

- [x] React + Vite frontend, Material UI, React Router, and Express backend
- [x] Environment templates and health endpoints
- [x] Local frontend-to-backend development setup

### Phase 2 — Database Foundation

- [x] Supabase PostgreSQL project, schema, and realistic seed data
- [x] Users, products, inventory, orders, and order items
- [x] Product cost data for profit calculation

### Phase 3 — Core Backend API

- [x] Product, inventory, and order APIs
- [x] Transactional order creation and inventory reduction
- [x] Low-stock data and kitchen status updates

### Phase 4 — Customer Ordering Flow

- [x] QR menu link, cart, checkout, order creation, and confirmation

### Phase 5 — Vendor Operations

- [x] Supabase vendor authentication and protected routes
- [x] Dashboard, orders, kitchen, inventory, low-stock alerts, and settings

### Phase 6 — Business Analytics

- [x] Today's completed revenue and count
- [x] Overall revenue and profit
- [x] Best seller, seven-day sales chart, and dashboard low-stock alerts

## Phase 7 — Qwen Business Advisor

### Objective

Provide grounded, concise recommendations from application data.

### Planned model

Qwen through the configured `QWEN_ENDPOINT` and `QWEN_MODEL`.

### Tasks

- [ ] Configure backend-only `QWEN_API_KEY`, `QWEN_ENDPOINT`, and `QWEN_MODEL`
- [ ] Create a provider adapter and Qwen client
- [ ] Generate a compact analytics and inventory summary
- [ ] Create concise prompt templates and response limits
- [ ] Add vendor request limits
- [ ] Build the protected AI Advisor page
- [ ] Test recommendations with seeded and completed-order data

## Phase 8 — Agent Architecture Refinement

- [ ] Formalize Manager, Order, Inventory, Kitchen, Business Intelligence, and Business Advisor agents
- [ ] Document each agent's inputs, outputs, and responsibility

## Phase 9 — Testing and Demo Polish

- [ ] Repeat end-to-end customer, kitchen, inventory, analytics, and advisor testing
- [ ] Add loading, empty, and error states where needed
- [ ] Check mobile responsiveness and secret handling
- [ ] Prepare demo data and demo script
