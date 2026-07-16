alter table public.users
add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

do $$
declare
  auth_vendor_id uuid;
begin
  select id into auth_vendor_id
  from auth.users
  order by created_at desc
  limit 1;

  if auth_vendor_id is null then
    raise exception 'Create a vendor user in Supabase Authentication before running this migration.';
  end if;

  update public.users
  set auth_user_id = auth_vendor_id
  where email = 'owner@warungmurni.test'
    and role = 'vendor';
end;
$$;
