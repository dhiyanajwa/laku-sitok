-- Manager Agent durable proposals and audit history.
-- Run after database/ingredient-stock-mvp.sql and database/menu-item-recipe-setup.sql.

create table if not exists public.manager_actions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  original_request text not null check (char_length(original_request) between 1 and 280),
  action_type text not null check (action_type in ('ingredient_restock', 'order_status')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'cancelled', 'expired', 'failed', 'completed')),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manager_actions_vendor_created_idx
on public.manager_actions (vendor_id, created_at desc);

create index if not exists manager_actions_vendor_status_idx
on public.manager_actions (vendor_id, status, expires_at);

drop trigger if exists manager_actions_set_updated_at on public.manager_actions;
create trigger manager_actions_set_updated_at
before update on public.manager_actions
for each row execute procedure public.set_updated_at();

alter table public.manager_actions enable row level security;