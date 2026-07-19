# Deployment Implementation Plan

## Goal

Deploy Laku Sitok as a public hackathon demo using:

- **Vercel** for the React + Vite frontend;
- **Render** for the Express API; and
- the existing **Supabase** project for Auth and PostgreSQL.

The goal is a secure, low-cost demo that works on desktop and phone. This plan does not move server secrets to the browser.

## Phase 0 — Freeze and verify the demo

**Outcome:** the known-good version is saved before deployment.

1. Confirm the local customer-to-vendor journey works:
   - customer menu and checkout;
   - kitchen Pending → Preparing → Ready → Completed;
   - ingredient-aware stock deduction and Can Still Make;
   - AI Manager approval action;
   - marketing WhatsApp share.
2. Run the frontend production build: `npm run build` in `frontend`.
3. Check that `.env` files are ignored and no secrets are committed.
4. Push the verified code to GitHub.

**Done when:** the GitHub repository contains the latest working code, but no `.env` files or secret values.

## Phase 1 — Add deployment guardrails

**Status:** Complete — Vercel SPA routing and the Render Node LTS version are configured in the repository.

**Outcome:** production hosts can serve the app consistently.

1. Add a Vercel SPA fallback so direct refreshes on `/vendor/login`, `/menu`, and tracking routes load the React app.
2. Pin a supported Node LTS version for the backend host.
3. Keep the existing server-side CORS allow-list. Do not add wildcard CORS.
4. Keep server-only values unprefixed; only public frontend values use `VITE_`.

**Done when:** the project has a Vercel route fallback and reproducible Node runtime configuration.

## Phase 2 — Deploy the Express API on Render

**Outcome:** the backend has a stable HTTPS URL.

1. Create a Render **Web Service** from the GitHub repository.
2. Set Root Directory to `backend`.
3. Use:
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Instance: Free
4. Configure server-only variables:

   ```env
   NODE_ENV=production
   TRUST_PROXY=1
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   QWEN_API_KEY=
   QWEN_ENDPOINT=
   QWEN_MODEL=qwen-max
   ORDER_DELAY_MINUTES=15
   ```

5. Temporarily leave `FRONTEND_URL` blank or use a placeholder until the Vercel URL exists.
6. Copy the generated Render URL and verify `/api/health`.

**Done when:** `https://<render-service>/api/health` returns an `ok` response.

## Phase 3 — Deploy the Vite frontend on Vercel

**Outcome:** the customer and vendor app has a public HTTPS URL.

1. Import the same GitHub repository into Vercel.
2. Set Root Directory to `frontend` and framework to **Vite**.
3. Use:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Configure browser-safe variables:

   ```env
   VITE_API_URL=https://<render-service>
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

5. Deploy and copy the final Vercel URL.

**Done when:** the landing page and customer menu load over HTTPS from Vercel.

## Phase 4 — Connect production services

**Outcome:** browser authentication and API calls are allowed only from the deployed app.

1. In Render, set:

   ```env
   FRONTEND_URL=https://<vercel-site>
   BACKEND_PUBLIC_URL=https://<render-service>
   ```

2. Redeploy Render after changing environment variables.
3. In Supabase Authentication URL Configuration, add the Vercel URL as the Site URL and allowed Redirect URL.
4. Verify Vercel browser requests to the API succeed without CORS errors.

**Done when:** a vendor can log in and use protected API features from the Vercel site.

## Phase 5 — Public acceptance test

**Outcome:** the exact judge demo works outside localhost.

1. Test on desktop and phone using the Vercel URL.
2. Test one complete order journey:
   - place customer order;
   - confirm Kitchen receives it and plays the new-order chime;
   - complete it;
   - verify inventory and Can Still Make update.
3. Test AI Manager approval and marketing WhatsApp sharing.
4. Check Render logs for unexpected errors.
5. Open the app shortly before the live demo to wake the free Render service.

**Done when:** all key demo steps work publicly, not only on localhost.

## Phase 6 — Submission and maintenance

**Outcome:** the project is ready to share with judges.

1. Add deployed frontend URL, repository URL, and demo credentials to the submission.
2. Keep the Supabase project active before judging; Free projects can pause after low activity.
3. Keep the Render URL warm before a live walkthrough; free services can sleep after inactivity.
4. Monitor AI provider quota / credits so Advisor and Marketing remain available during judging.

## Environment ownership

| Location | Allowed values |
| --- | --- |
| Vercel frontend | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Render backend | Supabase service-role key, Qwen key/configuration, CORS and operations values |
| Supabase dashboard | Database migrations, Auth users, Site URL, Redirect URLs |

Never put a service-role key or AI key in a `VITE_` variable.
