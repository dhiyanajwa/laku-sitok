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
  order_id uuid;
  order_number text;
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
    where id = (item->>'productId')::uuid
      and vendor_id = p_vendor_id
      and is_available = true
    for update;

    if not found then
      raise exception 'A requested product is unavailable.' using errcode = 'P0001';
    end if;

    select * into inventory_record
    from public.inventory
    where product_id = product_record.id
    for update;

    if not found or inventory_record.quantity < item_quantity then
      raise exception 'Insufficient stock for %.', product_record.name using errcode = 'P0001';
    end if;

    total := total + (product_record.price * item_quantity);
  end loop;

  order_number := 'LS-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.orders (order_number, vendor_id, customer_name, total_amount, status)
  values (order_number, p_vendor_id, p_customer_name, total, 'pending')
  returning id into order_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    select * into product_record from public.products where id = (item->>'productId')::uuid;

    insert into public.order_items (order_id, product_id, product_name, unit_price, unit_cost, quantity, subtotal)
    values (
      order_id,
      product_record.id,
      product_record.name,
      product_record.price,
      product_record.cost_price,
      item_quantity,
      product_record.price * item_quantity
    );

    update public.inventory
    set quantity = quantity - item_quantity,
        updated_at = now()
    where product_id = product_record.id;
  end loop;

  return jsonb_build_object('id', order_id, 'orderNumber', order_number, 'totalAmount', total, 'status', 'pending');
end;
$$;
revoke execute on function public.create_order(uuid, text, jsonb) from public;
grant execute on function public.create_order(uuid, text, jsonb) to service_role;