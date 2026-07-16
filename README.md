# Laku Sitok

AI-powered ordering and business operations platform for micro entrepreneurs.

## Current MVP

- QR customer ordering
- Vendor authentication and operations dashboard
- Orders, kitchen status workflow, and inventory controls
- Sales, profit, best-seller, and low-stock analytics
- Planned AI Business Advisor

## Technology

- Frontend: React, Vite, Material UI
- Backend: Node.js, Express
- Database and authentication: Supabase
- Planned AI provider: OpenRouter
- Planned model: `poolside/laguna-m.1:free` (Poolside Laguna M.1 Free)

## Security

Supabase service-role and OpenRouter API keys are backend-only secrets. They must never be added to the frontend environment file or returned by an API endpoint.
