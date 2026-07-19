      -- Links the intentional demo Auth user to the Warung Murni vendor row.
      -- If you use another demo email, change demo_vendor_email below before running this file.
      -- This migration never selects the most recently created Auth user.
      
      alter table public.users
      add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
      
      do $$
      declare
        demo_vendor_email text := 'warungmurni@gmail.com';
        auth_vendor_id uuid;
        vendor_record_id uuid;
      begin
        select id into auth_vendor_id
        from auth.users
        where lower(email) = lower(demo_vendor_email);
      
        if auth_vendor_id is null then
          raise exception 'Create the Supabase Auth user for % before running this migration.', demo_vendor_email;
        end if;
      
        select id into vendor_record_id
        from public.users
        where name = 'Warung Murni'
          and role = 'vendor';
      
        if vendor_record_id is null then
          raise exception 'The Warung Murni vendor row was not found. Run database/seed.sql first.';
        end if;
      
        update public.users
        set auth_user_id = auth_vendor_id,
            email = demo_vendor_email
        where id = vendor_record_id;
      end;
      $$;
