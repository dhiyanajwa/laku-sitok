-- Stall-opening Marketing Agent: run after database/marketing-campaigns.sql.
-- This preserves existing product promotion campaigns.

alter table public.marketing_settings
add column if not exists stall_tagline text;

alter table public.marketing_settings
add column if not exists google_maps_url text;

alter table public.marketing_settings
add column if not exists whatsapp_order_url text;

alter table public.marketing_settings
add column if not exists delivery_url text;

alter table public.marketing_settings
add column if not exists review_url text;

alter table public.marketing_settings
add column if not exists selling_points text[] not null default '{}';

alter table public.marketing_settings
add column if not exists default_hashtags text[] not null default '{}';

alter table public.marketing_campaigns
add column if not exists campaign_type text;

update public.marketing_campaigns
set campaign_type = 'product_promotion'
where campaign_type is null;

alter table public.marketing_campaigns
alter column campaign_type set default 'stall_opening';

alter table public.marketing_campaigns
alter column campaign_type set not null;

alter table public.marketing_campaigns
add column if not exists daily_note text;

alter table public.marketing_campaigns
alter column selected_product_id drop not null;

alter table public.marketing_campaigns
alter column product_name drop not null;

alter table public.marketing_campaigns
alter column product_price drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketing_campaigns_campaign_type_check'
  ) then
    alter table public.marketing_campaigns
    add constraint marketing_campaigns_campaign_type_check
    check (campaign_type in (
      'product_promotion',
      'stall_opening',
      'opening_later',
      'today_special',
      'closing_soon'
    ));
  end if;
end;
$$;

create index if not exists marketing_campaigns_vendor_type_created_idx
on public.marketing_campaigns (vendor_id, campaign_type, created_at desc);