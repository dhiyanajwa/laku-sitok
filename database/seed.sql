insert into public.users (name, email, role)
values ('Warung Murni', 'owner@warungmurni.test', 'vendor')
on conflict (email) do nothing;

insert into public.products (vendor_id, name, description, category, price, cost_price)
select vendor.id, product.name, product.description, product.category, product.price, product.cost_price
from public.users as vendor
cross join (
  values
    ('Nasi Lemak', 'Coconut rice served with sambal, egg, and peanuts.', 'Meals', 5.50, 2.40),
    ('Mee Goreng', 'Wok-fried noodles with vegetables and egg.', 'Meals', 6.50, 3.10),
    ('Teh Tarik', 'Pulled milk tea.', 'Drinks', 2.50, 0.80),
    ('Kopi O', 'Traditional black coffee.', 'Drinks', 2.00, 0.50),
    ('Karipap', 'Crispy curry puff.', 'Snacks', 1.50, 0.55)
) as product(name, description, category, price, cost_price)
where vendor.email = 'owner@warungmurni.test'
on conflict (vendor_id, name) do nothing;

insert into public.inventory (product_id, quantity, reorder_level)
select product.id,
  case product.name
    when 'Nasi Lemak' then 30
    when 'Mee Goreng' then 22
    when 'Teh Tarik' then 40
    when 'Kopi O' then 35
    when 'Karipap' then 4
  end,
  5
from public.products as product
join public.users as vendor on vendor.id = product.vendor_id
where vendor.email = 'owner@warungmurni.test'
on conflict (product_id) do nothing;

insert into public.orders (order_number, vendor_id, customer_name, total_amount, status, created_at)
select 'LS-1001', id, 'Aina', 10.50, 'completed', now() - interval '2 days'
from public.users where email = 'owner@warungmurni.test'
on conflict (order_number) do nothing;

insert into public.orders (order_number, vendor_id, customer_name, total_amount, status, created_at)
select 'LS-1002', id, 'Hafiz', 10.00, 'completed', now() - interval '1 day'
from public.users where email = 'owner@warungmurni.test'
on conflict (order_number) do nothing;

insert into public.orders (order_number, vendor_id, customer_name, total_amount, status)
select 'LS-1003', id, 'Siti', 8.00, 'pending'
from public.users where email = 'owner@warungmurni.test'
on conflict (order_number) do nothing;

insert into public.order_items (order_id, product_id, product_name, unit_price, unit_cost, quantity, subtotal)
select orders.id, products.id, products.name, products.price, products.cost_price, item.quantity, products.price * item.quantity
from (
  values
    ('LS-1001', 'Nasi Lemak', 1),
    ('LS-1001', 'Teh Tarik', 2),
    ('LS-1002', 'Mee Goreng', 1),
    ('LS-1002', 'Kopi O', 1),
    ('LS-1002', 'Karipap', 1),
    ('LS-1003', 'Nasi Lemak', 1),
    ('LS-1003', 'Teh Tarik', 1)
) as item(order_number, product_name, quantity)
join public.orders as orders on orders.order_number = item.order_number
join public.products as products on products.name = item.product_name
where not exists (
  select 1 from public.order_items as existing
  where existing.order_id = orders.id and existing.product_id = products.id
);

