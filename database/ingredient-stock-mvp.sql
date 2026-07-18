-- Can Still Make MVP: run this after database/order-tracking.sql.

alter table public.products
add column if not exists stock_mode text;

update public.products
set stock_mode = 'ready_item'
where stock_mode is null;

alter table public.products
alter column stock_mode set default 'ready_item';

alter table public.products
alter column stock_mode set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_stock_mode_check') then
    alter table public.products
    add constraint products_stock_mode_check check (stock_mode in ('ready_item', 'ingredient_recipe'));
  end if;
end;
$$;

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

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute procedure public.set_updated_at();

alter table public.ingredients enable row level security;
alter table public.product_recipe_ingredients enable row level security;
alter table public.ingredient_stock_movements enable row level security;

-- Demo data: Burger Special is intentionally ingredient-based.
insert into public.products (vendor_id, name, description, category, price, cost_price, stock_mode)
select id, 'Burger Special', 'Fresh burger with egg and cheese.', 'Meals', 8.50, 4.20, 'ingredient_recipe'
from public.users
where email = 'owner@warungmurni.test' and role = 'vendor'
on conflict (vendor_id, name) do update set stock_mode = 'ingredient_recipe';

insert into public.inventory (product_id, quantity, reorder_level)
select product.id, 0, 0
from public.products product
join public.users vendor on vendor.id = product.vendor_id
where vendor.email = 'owner@warungmurni.test' and product.name = 'Burger Special'
on conflict (product_id) do nothing;

insert into public.ingredients (vendor_id, name, quantity, unit, reorder_level)
select vendor.id, ingredient.name, ingredient.quantity, ingredient.unit, ingredient.reorder_level
from public.users vendor
cross join (
  values
    ('Burger bun', 12.00, 'pieces', 4.00),
    ('Burger patty', 10.00, 'pieces', 4.00),
    ('Egg', 18.00, 'pieces', 6.00),
    ('Cheese slice', 8.00, 'slices', 4.00),
    ('Burger wrapper', 20.00, 'pieces', 5.00)
) as ingredient(name, quantity, unit, reorder_level)
where vendor.email = 'owner@warungmurni.test' and vendor.role = 'vendor'
on conflict (vendor_id, name) do nothing;

insert into public.product_recipe_ingredients (product_id, ingredient_id, quantity_per_serving)
select product.id, ingredient.id, 1
from public.products product
join public.users vendor on vendor.id = product.vendor_id
join public.ingredients ingredient on ingredient.vendor_id = vendor.id
where vendor.email = 'owner@warungmurni.test'
  and product.name = 'Burger Special'
  and ingredient.name in ('Burger bun', 'Burger patty', 'Egg', 'Cheese slice', 'Burger wrapper')
on conflict (product_id, ingredient_id) do update set quantity_per_serving = excluded.quantity_per_serving;

create or replace function public.create_order(
  p_vendor_id uuid,
  p_customer_name text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_record public.products%rowtype;
  inventory_record public.inventory%rowtype;
  ingredient_requirement record;
  order_id uuid;
  order_number text;
  tracking_token uuid;
  total numeric(10, 2) := 0;
  item_quantity integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item.' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    if item->>'productId' is null or item_quantity is null or item_quantity <= 0 then
      raise exception 'Every item needs a productId and a quantity greater than zero.' using errcode = '22023';
    end if;

    select * into product_record
    from public.products
    where id = (item->>'productId')::uuid and vendor_id = p_vendor_id and is_available = true;

    if not found then
      raise exception 'A requested product is unavailable.' using errcode = 'P0001';
    end if;

    if product_record.stock_mode = 'ready_item' then
      select * into inventory_record from public.inventory where product_id = product_record.id;
      if not found or inventory_record.quantity < item_quantity then
        raise exception 'Insufficient stock for %.', product_record.name using errcode = 'P0001';
      end if;
    else
      if not exists (
        select 1
        from public.product_recipe_ingredients recipe
        join public.ingredients ingredient on ingredient.id = recipe.ingredient_id and ingredient.vendor_id = p_vendor_id
        where recipe.product_id = product_record.id
      ) then
        raise exception 'The recipe for % is incomplete.', product_record.name using errcode = 'P0001';
      end if;

      for ingredient_requirement in
        select ingredient.name, ingredient.quantity, recipe.quantity_per_serving * item_quantity as required_quantity
        from public.product_recipe_ingredients recipe
        join public.ingredients ingredient on ingredient.id = recipe.ingredient_id and ingredient.vendor_id = p_vendor_id
        where recipe.product_id = product_record.id
      loop
        if ingredient_requirement.quantity < ingredient_requirement.required_quantity then
          raise exception 'Insufficient ingredient stock: %.', ingredient_requirement.name using errcode = 'P0001';
        end if;
      end loop;
    end if;

    total := total + (product_record.price * item_quantity);
  end loop;

  order_number := 'LS-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  insert into public.orders (order_number, vendor_id, customer_name, total_amount, status)
  values (order_number, p_vendor_id, p_customer_name, total, 'pending')
  returning id, public.orders.tracking_token into order_id, tracking_token;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    select * into product_record from public.products where id = (item->>'productId')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, unit_cost, quantity, subtotal)
    values (order_id, product_record.id, product_record.name, product_record.price, product_record.cost_price, item_quantity, product_record.price * item_quantity);
  end loop;

  return jsonb_build_object('id', order_id, 'orderNumber', order_number, 'trackingToken', tracking_token, 'totalAmount', total, 'status', 'pending');
end;
$$;

create or replace function public.complete_order_with_stock(
  p_order_id uuid,
  p_vendor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record public.orders%rowtype;
  item_requirement record;
  ingredient_requirement record;
  inventory_record public.inventory%rowtype;
  ingredient_record public.ingredients%rowtype;
  recipe_product record;
  recipe_count integer;
  ready_item_count integer := 0;
  ingredient_count integer := 0;
begin
  select * into order_record
  from public.orders
  where id = p_order_id and vendor_id = p_vendor_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0001';
  end if;
  if order_record.status = 'completed' then
    raise exception 'This order has already been completed.' using errcode = 'P0001';
  end if;
  if order_record.status = 'cancelled' then
    raise exception 'Cancelled orders cannot be completed.' using errcode = 'P0001';
  end if;
  if order_record.status <> 'ready' then
    raise exception 'Only ready orders can be completed.' using errcode = 'P0001';
  end if;

  perform inventory.id
  from public.inventory inventory
  join public.order_items item on item.product_id = inventory.product_id and item.order_id = p_order_id
  join public.products product on product.id = item.product_id
  where product.stock_mode = 'ready_item'
  order by inventory.id
  for update of inventory;

  perform ingredient.id
  from public.ingredients ingredient
  join public.product_recipe_ingredients recipe on recipe.ingredient_id = ingredient.id
  join public.products product on product.id = recipe.product_id and product.vendor_id = p_vendor_id
  join public.order_items item on item.product_id = product.id and item.order_id = p_order_id
  where ingredient.vendor_id = p_vendor_id and product.stock_mode = 'ingredient_recipe'
  order by ingredient.id
  for update of ingredient;

  for recipe_product in
    select distinct product.id, product.name
    from public.order_items item
    join public.products product on product.id = item.product_id
    where item.order_id = p_order_id and product.stock_mode = 'ingredient_recipe'
  loop
    select count(*) into recipe_count
    from public.product_recipe_ingredients recipe
    join public.ingredients ingredient on ingredient.id = recipe.ingredient_id and ingredient.vendor_id = p_vendor_id
    where recipe.product_id = recipe_product.id;
    if recipe_count = 0 then
      raise exception 'The recipe for % is incomplete.', recipe_product.name using errcode = 'P0001';
    end if;
  end loop;

  for item_requirement in
    select item.product_id, product.name, sum(item.quantity)::integer as required_quantity
    from public.order_items item
    join public.products product on product.id = item.product_id
    where item.order_id = p_order_id and product.stock_mode = 'ready_item'
    group by item.product_id, product.name
  loop
    select * into inventory_record from public.inventory where product_id = item_requirement.product_id;
    if not found or inventory_record.quantity < item_requirement.required_quantity then
      raise exception 'Insufficient stock for %.', item_requirement.name using errcode = 'P0001';
    end if;
  end loop;

  for ingredient_requirement in
    select ingredient.id, ingredient.name, sum(recipe.quantity_per_serving * item.quantity) as required_quantity
    from public.order_items item
    join public.products product on product.id = item.product_id and product.vendor_id = p_vendor_id
    join public.product_recipe_ingredients recipe on recipe.product_id = product.id
    join public.ingredients ingredient on ingredient.id = recipe.ingredient_id and ingredient.vendor_id = p_vendor_id
    where item.order_id = p_order_id and product.stock_mode = 'ingredient_recipe'
    group by ingredient.id, ingredient.name
    order by ingredient.id
  loop
    select * into ingredient_record from public.ingredients where id = ingredient_requirement.id;
    if not found or ingredient_record.quantity < ingredient_requirement.required_quantity then
      raise exception 'Insufficient ingredient stock: %.', ingredient_requirement.name using errcode = 'P0001';
    end if;
  end loop;

  for item_requirement in
    select item.product_id, sum(item.quantity)::integer as required_quantity
    from public.order_items item
    join public.products product on product.id = item.product_id
    where item.order_id = p_order_id and product.stock_mode = 'ready_item'
    group by item.product_id
  loop
    update public.inventory
    set quantity = quantity - item_requirement.required_quantity, updated_at = now()
    where product_id = item_requirement.product_id;
    ready_item_count := ready_item_count + 1;
  end loop;

  for ingredient_requirement in
    select ingredient.id, sum(recipe.quantity_per_serving * item.quantity) as required_quantity
    from public.order_items item
    join public.products product on product.id = item.product_id and product.vendor_id = p_vendor_id
    join public.product_recipe_ingredients recipe on recipe.product_id = product.id
    join public.ingredients ingredient on ingredient.id = recipe.ingredient_id and ingredient.vendor_id = p_vendor_id
    where item.order_id = p_order_id and product.stock_mode = 'ingredient_recipe'
    group by ingredient.id
    order by ingredient.id
  loop
    update public.ingredients
    set quantity = quantity - ingredient_requirement.required_quantity, updated_at = now()
    where id = ingredient_requirement.id;
    insert into public.ingredient_stock_movements (vendor_id, ingredient_id, change_quantity, reason, order_id)
    values (p_vendor_id, ingredient_requirement.id, -ingredient_requirement.required_quantity, 'completed_order', p_order_id);
    ingredient_count := ingredient_count + 1;
  end loop;

  update public.orders
  set status = 'completed', updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'id', order_record.id,
    'orderNumber', order_record.order_number,
    'status', 'completed',
    'readyItemRowsUpdated', ready_item_count,
    'ingredientRowsUpdated', ingredient_count
  );
end;
$$;

revoke execute on function public.create_order(uuid, text, jsonb) from public;
grant execute on function public.create_order(uuid, text, jsonb) to service_role;
revoke execute on function public.complete_order_with_stock(uuid, uuid) from public;
grant execute on function public.complete_order_with_stock(uuid, uuid) to service_role;