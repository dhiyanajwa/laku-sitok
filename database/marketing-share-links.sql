alter table public.marketing_campaigns
add column if not exists share_token uuid;

update public.marketing_campaigns
set share_token = gen_random_uuid()
where share_token is null;

alter table public.marketing_campaigns
alter column share_token set default gen_random_uuid();

alter table public.marketing_campaigns
alter column share_token set not null;

create unique index if not exists marketing_campaigns_share_token_unique_idx
on public.marketing_campaigns (share_token);
