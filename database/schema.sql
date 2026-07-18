create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('customer', 'vendor')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  cost_price numeric(10, 2) not null default 0 check (cost_price >= 0),
  is_available boolean not null default true,
  stock_mode text not null default 'ready_item' check (stock_mode in ('ready_item', 'ingredient_recipe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, name)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tracking_token uuid not null unique default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete restrict,
  customer_id uuid references public.users(id) on delete set null,
  customer_name text,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0)
);


create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  unit text not null default 'pieces',
  reorder_level numeric(12, 2) not null default 0 check (reorder_level >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, name)
);

create table if not exists public.product_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_per_serving numeric(12, 2) not null check (quantity_per_serving > 0),
  unique (product_id, ingredient_id)
);

create table if not exists public.ingredient_stock_movements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  change_quantity numeric(12, 2) not null check (change_quantity <> 0),
  reason text not null check (reason in ('completed_order', 'manual_adjustment', 'restock')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ingredients_vendor_id_idx on public.ingredients(vendor_id);
create index if not exists recipe_ingredients_product_id_idx on public.product_recipe_ingredients(product_id);
create index if not exists ingredient_movements_ingredient_created_idx on public.ingredient_stock_movements(ingredient_id, created_at desc);
create index if not exists products_vendor_id_idx on public.products(vendor_id);
create index if not exists orders_vendor_created_at_idx on public.orders(vendor_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
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
create table if not exists public.marketing_settings (
  vendor_id uuid primary key references public.users(id) on delete cascade,
  brand_tone text not null default 'warm and friendly',
  language text not null default 'English',
  location text,
  operating_hours text,
  hashtags_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  share_token uuid not null unique default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  selected_product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_price numeric(10, 2) not null check (product_price >= 0),
  title text not null,
  caption text not null,
  call_to_action text,
  hashtags text[] not null default '{}',
  reason text,
  language text not null default 'English',
  tone text not null default 'warm and friendly',
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_activity (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  vendor_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('draft_created', 'draft_edited', 'approved', 'rejected', 'share_opened')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists manager_actions_vendor_created_idx on public.manager_actions (vendor_id, created_at desc);
create index if not exists manager_actions_vendor_status_idx on public.manager_actions (vendor_id, status, expires_at);
create index if not exists marketing_campaigns_vendor_created_idx on public.marketing_campaigns(vendor_id, created_at desc);
create index if not exists campaign_activity_campaign_created_idx on public.campaign_activity(campaign_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute procedure public.set_updated_at();
drop trigger if exists manager_actions_set_updated_at on public.manager_actions;
create trigger manager_actions_set_updated_at before update on public.manager_actions for each row execute procedure public.set_updated_at();
drop trigger if exists marketing_settings_set_updated_at on public.marketing_settings;
create trigger marketing_settings_set_updated_at before update on public.marketing_settings for each row execute procedure public.set_updated_at();
drop trigger if exists marketing_campaigns_set_updated_at on public.marketing_campaigns;
create trigger marketing_campaigns_set_updated_at before update on public.marketing_campaigns for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ingredients enable row level security;
alter table public.product_recipe_ingredients enable row level security;
alter table public.ingredient_stock_movements enable row level security;
alter table public.manager_actions enable row level security;
alter table public.marketing_settings enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.campaign_activity enable row level security;





