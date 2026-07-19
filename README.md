# Laku Sitok

> One stall. Every daily operation. In sync.

Laku Sitok is an AI-assisted operating workspace for small food stalls. It connects customer ordering, kitchen workflow, ingredient-aware inventory, business insights, and daily marketing in one practical flow.

Built for **OpenAI Build Week 2026** under the **Work & Productivity** track.

## The problem

Small food-stall vendors often handle orders, preparation, stock checks, sales tracking, and customer promotion across separate tools—or entirely in their head. This makes it easy to miss orders, run out of ingredients, or lose time deciding what to do next.

Laku Sitok turns that scattered work into one connected daily loop:

1. A customer orders from a mobile-friendly menu.
2. The vendor prepares and completes the order in the Kitchen.
3. Finished-item or ingredient stock is adjusted safely.
4. Sales and inventory data become grounded operational advice.
5. The vendor can create and share an opening marketing post.

## What it does

| Area | Capability |
| --- | --- |
| Customer ordering | QR-friendly menu, cart, order creation, and order tracking |
| Kitchen | Pending → Preparing → Ready → Completed workflow |
| Stock | Ready-item inventory, ingredient quantities, recipes, low-stock indicators, and “Can Still Make” calculations |
| AI Manager | Deterministic operational context and confirmation-based actions for kitchen and restocking tasks |
| AI Advisor | Grounded advice based on completed sales and current inventory |
| Marketing | Opening-post drafts, vendor-controlled approval, and WhatsApp sharing |
| Stall status | Scheduled opening hours plus manual temporary open/close controls |

## Product flow

~~~
Customer menu
  → Order created
  → Kitchen prepares and completes it
  → Finished stock or recipe ingredients update
  → Dashboard / AI Manager receives current operational context
  → Vendor makes the next decision or shares an opening post
~~~

## Architecture

~~~
React + Vite + Material UI
        ↓
Node.js + Express API
        ↓
Supabase Auth + PostgreSQL + transactional RPC functions
        ↓
Qwen runtime model for grounded advisor and marketing drafts
~~~

The frontend uses the Supabase anon key for authentication only. Protected vendor actions go through the Express API, which verifies the Supabase session and uses the Supabase service-role key only on the server.

## Tech stack

- Frontend: React, Vite, Material UI, React Router
- Backend: Node.js, Express
- Database and authentication: Supabase PostgreSQL and Supabase Auth
- Runtime AI: Qwen through the configured DashScope-compatible endpoint
- Development workflow: Codex with GPT-5.6

## How Codex and GPT-5.6 were used

Codex with GPT-5.6 was used throughout the Build Week implementation to:

- turn the vendor workflow into a phased product and technical plan;
- design the Supabase schema and transactional order / stock functions;
- build the customer, kitchen, inventory, marketing, and manager experiences;
- refine the agent workflow so deterministic data preparation is separate from AI-generated advice;
- improve UI clarity, mobile access, visual polish, and dark-mode support; and
- diagnose and verify integration issues while testing the complete order journey.

Qwen is the runtime model used inside the product for advisor and marketing copy. It is separate from the use of Codex and GPT-5.6 to build Laku Sitok.

## Run locally

### Prerequisites

- Node.js 20 or newer
- A Supabase project
- A Qwen-compatible API endpoint and key for the advisor and marketing features

### 1. Install dependencies

~~~
cd backend
npm install

cd ../frontend
npm install
~~~

### 2. Configure environment files

Copy the example files, then fill in your own values:

~~~
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
~~~

**backend/.env** needs:

~~~
PORT=5000
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:5000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
QWEN_API_KEY=
QWEN_ENDPOINT=
QWEN_MODEL=qwen-max
ORDER_DELAY_MINUTES=15

# Required only when running backend/fix-vendor-link.js
DEMO_VENDOR_EMAIL=warungmurni@gmail.com
~~~

**frontend/.env** needs:

~~~
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
~~~

Never place **SUPABASE_SERVICE_ROLE_KEY** or **QWEN_API_KEY** in the frontend environment file.

### 3. Set up Supabase

Run these SQL files in the Supabase SQL Editor, in this order:

1. database/schema.sql
2. database/seed.sql
3. database/order-tracking.sql
4. database/ingredient-stock-mvp.sql
5. database/menu-item-recipe-setup.sql
6. database/marketing-campaigns.sql
7. database/marketing-share-links.sql
8. database/stall-opening-marketing.sql
9. database/stall-availability.sql
10. database/manager-actions.sql

Create the dedicated demo user in Supabase Authentication, then run **database/link-demo-vendor.sql**. It links only the exact **warungmurni@gmail.com** Auth user to the Warung Murni vendor row; it never chooses the most recently created user.

If you choose another demo email, update **DEMO_VENDOR_EMAIL** in **backend/.env** and the **demo_vendor_email** value in **database/link-demo-vendor.sql** before running the helper.

### 4. Start the app

Run these in separate terminals:

~~~
cd backend
npm run dev
~~~

~~~
cd frontend
npm run dev
~~~

- Frontend: http://localhost:5173
- API health check: http://localhost:5000/api/health

## Demo walkthrough

### Customer flow

1. Open the landing page or customer menu.
2. Add a menu item and place an order.
3. Open the order tracking link.

### Vendor flow

1. Sign in using a dedicated demo-only vendor account.
2. Open the stall from the Dashboard if it is closed.
3. In Kitchen, move the customer order through Preparing, Ready, and Completed.
4. Open Inventory to see finished-stock or ingredient changes.
5. Open AI Advisor or AI Manager for grounded operational context.
6. Open Marketing to generate, approve, and share an opening post.

For a public hackathon demo, use a dedicated account with fake data only. Do not reuse a personal email, personal password, or real customer information.

## Deployment notes

For judging, deploy both the frontend and API so they are publicly accessible:

- Set **VITE_API_URL** to the deployed API URL before building the frontend.
- Set **FRONTEND_URL** in the backend to the deployed frontend URL so CORS permits it.
- Set **BACKEND_PUBLIC_URL** to the deployed API URL for future public campaign-share pages.
- Add backend secrets only in the host's server-side environment settings.
- Keep the Supabase service-role key and Qwen key private.
- Test the deployed flow in an incognito browser and on a phone before sharing it with judges.

## Security

- .env files, key files, and build output are ignored by Git.
- Supabase service-role and Qwen API keys are server-only secrets.
- The Supabase anon key is intentionally available to the browser for Supabase Auth; it must still be protected by appropriate Supabase Row Level Security policies.
- The public demo account must be treated as a low-privilege test account with fake data only.

## Submission checklist

- [ ] Deploy a working frontend and backend
- [ ] Test customer order → kitchen → completed stock update on the deployed app
- [ ] Add deployed demo URL and testing instructions to Devpost
- [ ] Record a public YouTube demo under three minutes, with English voiceover
- [ ] Explain what Codex and GPT-5.6 contributed during development
- [ ] Provide the main Codex /feedback Session ID requested by Devpost
- [ ] Make the repository public with a license, or privately share it with the required Devpost/OpenAI judging addresses
- [x] Add a final LICENSE file before publishing the repository

## License

MIT License © 2026 Dhiya Najwa Atma binti Drahman. See [LICENSE](LICENSE).
