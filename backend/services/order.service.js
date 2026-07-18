import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

const validStatuses = new Set(['pending', 'preparing', 'ready', 'completed', 'cancelled'])
const allowedTransitions = {
  pending: new Set(['preparing', 'cancelled']),
  preparing: new Set(['ready', 'cancelled']),
  ready: new Set(['completed']),
  completed: new Set(),
  cancelled: new Set(),
}
export function getAllowedOrderTransitions(status) {
  return Array.from(allowedTransitions[status] || [])
}

const trackingTokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw appError('An order needs at least one item.')
  const combined = new Map()
  for (const item of items) {
    const quantity = Number(item.quantity)
    if (!item.productId || !Number.isInteger(quantity) || quantity <= 0) throw appError('Each item needs a productId and a whole-number quantity greater than zero.')
    combined.set(item.productId, (combined.get(item.productId) || 0) + quantity)
  }
  return Array.from(combined, ([productId, quantity]) => ({ productId, quantity }))
}

export async function createOrder(vendorId, input) {
  const items = validateItems(input.items)
  const { data, error } = await supabase.rpc('create_order', { p_vendor_id: vendorId, p_customer_name: input.customerName?.trim() || null, p_items: items })
  if (error?.code === 'P0001' || error?.code === '22023') throw appError(error.message)
  if (error) throw error
  return data
}

export async function listOrders(vendorId, status) {
  if (status && !validStatuses.has(status)) throw appError('Invalid order status.')
  let query = supabase.from('orders').select('id, order_number, customer_name, total_amount, status, created_at, updated_at, order_items(id, product_id, product_name, unit_price, quantity, subtotal)').eq('vendor_id', vendorId).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPublicOrderTracking(trackingToken) {
  if (!trackingTokenPattern.test(trackingToken)) throw appError('This tracking link is invalid or has expired.', 404)
  const { data, error } = await supabase.from('orders').select('order_number, status, created_at, updated_at, order_items(product_name, quantity)').eq('tracking_token', trackingToken).single()
  if (error?.code === 'PGRST116') throw appError('This tracking link is invalid or has expired.', 404)
  if (error) throw error
  return { orderNumber: data.order_number, status: data.status, createdAt: data.created_at, updatedAt: data.updated_at, items: data.order_items.map((item) => ({ productName: item.product_name, quantity: item.quantity })) }
}

export async function updateOrderStatus(orderId, vendorId, status) {
  if (!validStatuses.has(status)) throw appError('Invalid order status.')

  const { data: currentOrder, error: currentError } = await supabase
    .from('orders')
    .select('id, order_number, status')
    .eq('id', orderId)
    .eq('vendor_id', vendorId)
    .single()

  if (currentError?.code === 'PGRST116') throw appError('Order not found.', 404)
  if (currentError) throw currentError

  if (currentOrder.status === status) throw appError(`${currentOrder.order_number} is already ${status}.`, 409)
  if (!allowedTransitions[currentOrder.status]?.has(status)) {
    throw appError(`Cannot move ${currentOrder.order_number} from ${currentOrder.status} to ${status}.`, 409)
  }

  if (status === 'completed') {
    const { data, error } = await supabase.rpc('complete_order_with_stock', { p_order_id: orderId, p_vendor_id: vendorId })
    if (error?.code === 'P0001' || error?.code === '22023') throw appError(error.message, 409)
    if (error) throw error
    return { id: data.id, order_number: data.orderNumber, status: data.status, readyItemRowsUpdated: data.readyItemRowsUpdated, ingredientRowsUpdated: data.ingredientRowsUpdated }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('vendor_id', vendorId)
    .eq('status', currentOrder.status)
    .select()
    .single()

  if (error?.code === 'PGRST116') throw appError('This order changed in another session. Refresh and try again.', 409)
  if (error) throw error
  return data
}