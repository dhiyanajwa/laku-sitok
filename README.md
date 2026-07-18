# Laku Sitok

AI-powered ordering and business operations platform for micro entrepreneurs.

## Current MVP

- QR customer ordering
- Vendor authentication and operations dashboard
- Orders, kitchen status workflow, and inventory controls
- Sales, profit, best-seller, and low-stock analytics
- Qwen-powered Business Advisor and Marketing Agent
- Ask Manager operational drawer with confirmed restocks and kitchen updates

## Technology

- Frontend: React, Vite, Material UI
- Backend: Node.js, Express
- Database and authentication: Supabase
- AI provider: Qwen (DashScope-compatible endpoint)
- AI model: configured with `QWEN_MODEL`

## Security

Supabase service-role and Qwen API keys are backend-only secrets. They must never be added to the frontend environment file or returned by an API endpoint.
