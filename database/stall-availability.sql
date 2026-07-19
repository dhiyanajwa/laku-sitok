-- Stall availability MVP: run after database/stall-opening-marketing.sql.
-- Existing operating_hours text remains for marketing copy; these values are used
-- for safe, machine-readable ordering availability.

alter table public.marketing_settings
add column if not exists opening_time time;

alter table public.marketing_settings
add column if not exists closing_time time;

alter table public.marketing_settings
add column if not exists stall_override text;

alter table public.marketing_settings
add column if not exists override_set_at timestamptz;

alter table public.marketing_settings
add column if not exists override_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketing_settings_stall_override_check'
  ) then
    alter table public.marketing_settings
    add constraint marketing_settings_stall_override_check
    check (stall_override in ('open', 'closed') or stall_override is null);
  end if;
end;
$$;

create index if not exists marketing_settings_override_expiry_idx
on public.marketing_settings (override_expires_at)
where stall_override is not null;
