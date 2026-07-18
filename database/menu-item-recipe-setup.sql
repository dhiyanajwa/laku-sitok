-- Menu item and recipe setup: run after database/ingredient-stock-mvp.sql.

create or replace function public.create_product_with_setup(
  p_vendor_id uuid,
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_category text;
  v_description text;
  v_stock_mode text;
  v_price numeric(10, 2);
  v_cost_price numeric(10, 2);
  v_is_available boolean := true;
  v_quantity integer;
  v_reorder_level integer;
  v_recipe jsonb;
  v_item jsonb;
  v_inline_ingredient jsonb;
  v_resolved_items jsonb := '[]'::jsonb;
  v_resolved_item jsonb;
  v_seen_ingredient_ids uuid[] := '{}'::uuid[];
  v_ingredient_id uuid;
  v_ingredient_name text;
  v_ingredient_unit text;
  v_ingredient_quantity numeric(12, 2);
  v_ingredient_reorder_level numeric(12, 2);
  v_quantity_per_serving numeric(12, 2);
  v_product_id uuid;
begin
  if p_vendor_id is null then
    raise exception 'A vendor is required.' using errcode = '22023';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'Menu item details are required.' using errcode = '22023';
  end if;

  v_name := nullif(btrim(p_input->>'name'), '');
  v_category := nullif(btrim(p_input->>'category'), '');
  v_description := nullif(btrim(p_input->>'description'), '');
  v_stock_mode := nullif(btrim(p_input->>'stockMode'), '');

  if v_name is null then
    raise exception 'Menu item name is required.' using errcode = '22023';
  end if;
  if v_category is null then
    raise exception 'Category is required.' using errcode = '22023';
  end if;
  if v_stock_mode not in ('ready_item', 'ingredient_recipe') then
    raise exception 'Choose Ready item or Made from ingredients.' using errcode = '22023';
  end if;
  if coalesce(p_input->>'price', '') !~ '^[0-9]+([.][0-9]+)?$' then
    raise exception 'Selling price must be a number zero or greater.' using errcode = '22023';
  end if;
  if coalesce(p_input->>'costPrice', '') !~ '^[0-9]+([.][0-9]+)?$' then
    raise exception 'Cost price must be a number zero or greater.' using errcode = '22023';
  end if;

  v_price := (p_input->>'price')::numeric(10, 2);
  v_cost_price := (p_input->>'costPrice')::numeric(10, 2);

  if p_input ? 'isAvailable' then
    if jsonb_typeof(p_input->'isAvailable') <> 'boolean' then
      raise exception 'isAvailable must be true or false.' using errcode = '22023';
    end if;
    v_is_available := (p_input->>'isAvailable')::boolean;
  end if;

  if exists (
    select 1 from public.products
    where vendor_id = p_vendor_id and lower(name) = lower(v_name)
  ) then
    raise exception 'A menu item with this name already exists.' using errcode = '22023';
  end if;

  if v_stock_mode = 'ready_item' then
    if coalesce(p_input->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'Ready-item quantity must be a whole number zero or greater.' using errcode = '22023';
    end if;
    if coalesce(p_input->>'reorderLevel', '') !~ '^[0-9]+$' then
      raise exception 'Ready-item reorder level must be a whole number zero or greater.' using errcode = '22023';
    end if;
    v_quantity := (p_input->>'quantity')::integer;
    v_reorder_level := (p_input->>'reorderLevel')::integer;
  else
    v_quantity := 0;
    v_reorder_level := 0;
    v_recipe := coalesce(p_input->'recipe', '[]'::jsonb);

    if jsonb_typeof(v_recipe) <> 'array' or jsonb_array_length(v_recipe) = 0 then
      raise exception 'A made-from-ingredients item needs at least one recipe ingredient.' using errcode = '22023';
    end if;

    for v_item in select value from jsonb_array_elements(v_recipe)
    loop
      if jsonb_typeof(v_item) <> 'object' then
        raise exception 'Each recipe row must be valid.' using errcode = '22023';
      end if;
      if coalesce(v_item->>'quantityPerServing', '') !~ '^[0-9]+([.][0-9]+)?$' or (v_item->>'quantityPerServing')::numeric <= 0 then
        raise exception 'Recipe quantity per serving must be greater than zero.' using errcode = '22023';
      end if;
      v_quantity_per_serving := (v_item->>'quantityPerServing')::numeric(12, 2);

      if nullif(btrim(v_item->>'ingredientId'), '') is not null and jsonb_typeof(v_item->'newIngredient') = 'object' then
        raise exception 'Choose either an existing ingredient or a new ingredient for each recipe row.' using errcode = '22023';
      end if;

      if nullif(btrim(v_item->>'ingredientId'), '') is not null then
        select id into v_ingredient_id
        from public.ingredients
        where id::text = v_item->>'ingredientId' and vendor_id = p_vendor_id;
        if not found then
          raise exception 'Each selected ingredient must belong to this vendor.' using errcode = '22023';
        end if;
      elsif jsonb_typeof(v_item->'newIngredient') = 'object' then
        v_inline_ingredient := v_item->'newIngredient';
        v_ingredient_name := nullif(btrim(v_inline_ingredient->>'name'), '');
        v_ingredient_unit := nullif(btrim(v_inline_ingredient->>'unit'), '');

        if v_ingredient_name is null or v_ingredient_unit is null then
          raise exception 'A new ingredient needs a name and unit.' using errcode = '22023';
        end if;
        if coalesce(v_inline_ingredient->>'quantity', '') !~ '^[0-9]+([.][0-9]+)?$' then
          raise exception 'New ingredient quantity must be a number zero or greater.' using errcode = '22023';
        end if;
        if coalesce(v_inline_ingredient->>'reorderLevel', '') !~ '^[0-9]+([.][0-9]+)?$' then
          raise exception 'New ingredient reorder level must be a number zero or greater.' using errcode = '22023';
        end if;

        v_ingredient_quantity := (v_inline_ingredient->>'quantity')::numeric(12, 2);
        v_ingredient_reorder_level := (v_inline_ingredient->>'reorderLevel')::numeric(12, 2);

        if exists (
          select 1 from public.ingredients
          where vendor_id = p_vendor_id and lower(name) = lower(v_ingredient_name)
        ) then
          raise exception 'A new ingredient already exists. Select the existing ingredient instead.' using errcode = '22023';
        end if;

        insert into public.ingredients (vendor_id, name, quantity, unit, reorder_level)
        values (p_vendor_id, v_ingredient_name, v_ingredient_quantity, v_ingredient_unit, v_ingredient_reorder_level)
        returning id into v_ingredient_id;
      else
        raise exception 'Each recipe row needs an existing ingredient or a new ingredient.' using errcode = '22023';
      end if;

      if v_ingredient_id = any(v_seen_ingredient_ids) then
        raise exception 'The same ingredient cannot be used twice in one recipe.' using errcode = '22023';
      end if;
      v_seen_ingredient_ids := array_append(v_seen_ingredient_ids, v_ingredient_id);
      v_resolved_items := v_resolved_items || jsonb_build_array(jsonb_build_object(
        'ingredientId', v_ingredient_id,
        'quantityPerServing', v_quantity_per_serving
      ));
    end loop;
  end if;

  insert into public.products (vendor_id, name, description, category, price, cost_price, is_available, stock_mode)
  values (p_vendor_id, v_name, v_description, v_category, v_price, v_cost_price, v_is_available, v_stock_mode)
  returning id into v_product_id;

  insert into public.inventory (product_id, quantity, reorder_level)
  values (v_product_id, v_quantity, v_reorder_level);

  if v_stock_mode = 'ingredient_recipe' then
    for v_resolved_item in select value from jsonb_array_elements(v_resolved_items)
    loop
      insert into public.product_recipe_ingredients (product_id, ingredient_id, quantity_per_serving)
      values (
        v_product_id,
        (v_resolved_item->>'ingredientId')::uuid,
        (v_resolved_item->>'quantityPerServing')::numeric(12, 2)
      );
    end loop;
  end if;

  return jsonb_build_object('productId', v_product_id);
end;
$$;

create or replace function public.replace_product_recipe_with_setup(
  p_vendor_id uuid,
  p_product_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_mode text;
  v_item jsonb;
  v_resolved_items jsonb := '[]'::jsonb;
  v_resolved_item jsonb;
  v_seen_ingredient_ids uuid[] := '{}'::uuid[];
  v_ingredient_id uuid;
  v_quantity_per_serving numeric(12, 2);
begin
  select stock_mode into v_stock_mode
  from public.products
  where id = p_product_id and vendor_id = p_vendor_id
  for update;

  if not found then
    raise exception 'Product not found.' using errcode = 'P0001';
  end if;
  if v_stock_mode <> 'ingredient_recipe' then
    raise exception 'Only made-from-ingredients items can have a recipe.' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A recipe needs at least one ingredient.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' or nullif(btrim(v_item->>'ingredientId'), '') is null then
      raise exception 'Each recipe row needs an ingredient.' using errcode = '22023';
    end if;
    if coalesce(v_item->>'quantityPerServing', '') !~ '^[0-9]+([.][0-9]+)?$' or (v_item->>'quantityPerServing')::numeric <= 0 then
      raise exception 'Recipe quantity per serving must be greater than zero.' using errcode = '22023';
    end if;

    select id into v_ingredient_id
    from public.ingredients
    where id::text = v_item->>'ingredientId' and vendor_id = p_vendor_id;
    if not found then
      raise exception 'Each selected ingredient must belong to this vendor.' using errcode = '22023';
    end if;
    if v_ingredient_id = any(v_seen_ingredient_ids) then
      raise exception 'The same ingredient cannot be used twice in one recipe.' using errcode = '22023';
    end if;

    v_quantity_per_serving := (v_item->>'quantityPerServing')::numeric(12, 2);
    v_seen_ingredient_ids := array_append(v_seen_ingredient_ids, v_ingredient_id);
    v_resolved_items := v_resolved_items || jsonb_build_array(jsonb_build_object(
      'ingredientId', v_ingredient_id,
      'quantityPerServing', v_quantity_per_serving
    ));
  end loop;

  delete from public.product_recipe_ingredients where product_id = p_product_id;

  for v_resolved_item in select value from jsonb_array_elements(v_resolved_items)
  loop
    insert into public.product_recipe_ingredients (product_id, ingredient_id, quantity_per_serving)
    values (
      p_product_id,
      (v_resolved_item->>'ingredientId')::uuid,
      (v_resolved_item->>'quantityPerServing')::numeric(12, 2)
    );
  end loop;

  return jsonb_build_object('productId', p_product_id);
end;
$$;

revoke execute on function public.create_product_with_setup(uuid, jsonb) from public;
grant execute on function public.create_product_with_setup(uuid, jsonb) to service_role;
revoke execute on function public.replace_product_recipe_with_setup(uuid, uuid, jsonb) from public;
grant execute on function public.replace_product_recipe_with_setup(uuid, uuid, jsonb) to service_role;
