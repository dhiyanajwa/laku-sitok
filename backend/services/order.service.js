import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

const validStatuses = new Set(['pending', 'preparing', 'ready', 'completed', 'cancelled'])

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw appError('An order needs at least one item.')

  const combined = new Map()

  for (const item of items) {
    const quantity = Number(item.quantity)
    if (!item.productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw appError('Each item needs a productId and a whole-number quantity greater than zero.')
    }

    combined.set(item.productId, (combined.get(item.productId) || 0) + quantity)
  }

  return Array.from(combined, ([productId, quantity]) => ({ productId, quantity }))
}

export async function createOrder(vendorId, input) {
  const items = validateItems(input.items)
  const { data, error } = await supabase.rpc('create_order', {
    p_vendor_id: vendorId,
    p_customer_name: input.customerName?.trim() || null,
    p_items: items,
  })

  if (error?.code === 'P0001' || error?.code === '22023') throw appError(error.message)
  if (error) throw error
  return data
}

export async function listOrders(vendorId, status) {
  if (status && !validStatuses.has(status)) throw appError('Invalid order status.')

  let query = supabase
    .from('orders')
    .select('id, order_number, customer_name, total_amount, status, created_at, updated_at, order_items(id, product_id, product_name, unit_price, quantity, subtotal)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateOrderStatus(orderId, vendorId, status) {
  if (!validStatuses.has(status)) throw appError('Invalid order status.')

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('vendor_id', vendorId)
    .select()
    .single()

  if (error?.code === 'PGRST116') throw appError('Order not found.', 404)
  if (error) throw error
  return data
}
