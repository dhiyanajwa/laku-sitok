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

create index if not exists marketing_campaigns_vendor_created_idx on public.marketing_campaigns(vendor_id, created_at desc);
create index if not exists campaign_activity_campaign_created_idx on public.campaign_activity(campaign_id, created_at desc);

drop trigger if exists marketing_settings_set_updated_at on public.marketing_settings;
create trigger marketing_settings_set_updated_at before update on public.marketing_settings for each row execute procedure public.set_updated_at();
drop trigger if exists marketing_campaigns_set_updated_at on public.marketing_campaigns;
create trigger marketing_campaigns_set_updated_at before update on public.marketing_campaigns for each row execute procedure public.set_updated_at();

alter table public.marketing_settings enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.campaign_activity enable row level security;
