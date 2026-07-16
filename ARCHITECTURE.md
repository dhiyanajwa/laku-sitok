# Laku Sitok System Architecture

## Stack

- React + Vite + Material UI frontend
- Node.js + Express API
- Supabase PostgreSQL and Supabase Authentication
- Planned AI: OpenRouter with `poolside/laguna-m.1:free`

## Request Flow

```text
Customer or vendor UI
        ↓
Express routes and controllers
        ↓
Services
        ↓
Supabase database / planned AI service
```

The browser uses the Supabase anonymous key only for vendor sign-in. The Express backend owns database writes with the service-role key and verifies vendor access tokens before vendor-only routes.

## Current Application Flow

```text
Customer order
    ↓
Database transaction creates order and order items
    ↓
Inventory is reduced atomically
    ↓
Vendor updates kitchen status
    ↓
Completed orders feed analytics
```

## Planned AI Flow

```text
Authenticated vendor question
    ↓
Advisor endpoint
    ↓
Analytics and inventory summary
    ↓
OpenRouter: poolside/laguna-m.1:free
    ↓
Concise business recommendation
```

The AI service remains behind a provider adapter so a model/provider can be changed later without changing the frontend.

## Agent Direction

Phase 8 will formalize Manager, Order, Inventory, Kitchen, Business Intelligence, and Business Advisor agents. Until then, the existing service layer is the source of truth for operational workflows.
