# Development Rules

## Frontend

- Use React functional components and Material UI.
- Keep vendor-only pages behind the authentication route.
- Never use backend secrets in `frontend/.env`; only `VITE_` public values belong there.

## Backend

- Keep routes, controllers, and services separate.
- Verify a vendor access token before vendor-only data operations.
- Keep Supabase service-role and OpenRouter keys in `backend/.env` only.
- Use `poolside/laguna-m.1:free` through the provider adapter planned for Phase 7.

## Style

- Use meaningful names.
- Keep functions focused.
- Add comments only where the logic is not self-explanatory.
