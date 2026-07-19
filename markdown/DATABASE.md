# Database Design

## Platform

Supabase provides managed PostgreSQL and authentication. The Express backend owns data writes; the service-role key is never exposed to browser clients.

## Tables

### users

`id`, `name`, `email`, `role`, `auth_user_id`, `created_at`

`auth_user_id` links a vendor profile to a Supabase Authentication user.

### products

`id`, `vendor_id`, `name`, `description`, `category`, `price`, `cost_price`, `is_available`, timestamps

### inventory

`id`, `product_id`, `quantity`, `reorder_level`, `updated_at`

### orders

`id`, `order_number`, `vendor_id`, `customer_name`, `total_amount`, `status`, timestamps

Statuses: `pending`, `preparing`, `ready`, `completed`, `cancelled`.

### order_items

`id`, `order_id`, `product_id`, `product_name`, `unit_price`, `unit_cost`, `quantity`, `subtotal`

The unit price and unit cost are saved at ordering time so historical revenue and profit remain accurate.
