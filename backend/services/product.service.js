import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'
import { listProductAvailability } from './availability.service.js'

function updateProductPayload(input) {
  const updates = {}

  if (input.name !== undefined) {
    const name = input.name?.trim()
    if (!name) throw appError('name cannot be empty.')
    updates.name = name
  }

  if (input.category !== undefined) {
    const category = input.category?.trim()
    if (!category) throw appError('category cannot be empty.')
    updates.category = category
  }

  if (input.description !== undefined) updates.description = input.description?.trim() || null

  if (input.price !== undefined) {
    const price = Number(input.price)
    if (!Number.isFinite(price) || price < 0) throw appError('price must be zero or greater.')
    updates.price = price
  }

  if (input.costPrice !== undefined) {
    const costPrice = Number(input.costPrice)
    if (!Number.isFinite(costPrice) || costPrice < 0) throw appError('costPrice must be zero or greater.')
    updates.cost_price = costPrice
  }

  if (input.isAvailable !== undefined) {
    if (typeof input.isAvailable !== 'boolean') throw appError('isAvailable must be true or false.')
    updates.is_available = input.isAvailable
  }

  if (input.stockMode !== undefined) {
    throw appError('Stock method cannot be changed after creation. Create a new menu item instead.')
  }

  if (Object.keys(updates).length === 0) throw appError('Provide at least one product field to update.')
  return updates
}

export async function listProducts(vendorId) {
  const [productsResult, availability, salesResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, category, price, cost_price, is_available, stock_mode, inventory(quantity, reorder_level, updated_at)')
      .eq('vendor_id', vendorId)
      .order('category')
      .order('name'),
    listProductAvailability(vendorId),
    supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(vendor_id, status)')
      .eq('orders.vendor_id', vendorId)
      .eq('orders.status', 'completed'),
  ])

  if (productsResult.error) throw productsResult.error
  if (salesResult.error) throw salesResult.error
  const byProductId = new Map(availability.map((item) => [item.productId, item]))
  const popularityByProductId = new Map()
  for (const item of salesResult.data || []) {
    popularityByProductId.set(item.product_id, (popularityByProductId.get(item.product_id) || 0) + Number(item.quantity || 0))
  }
  return (productsResult.data || []).map((product) => ({ ...product, ...byProductId.get(product.id), popularity: popularityByProductId.get(product.id) || 0 }))
}

export async function createProduct(vendorId, input) {
  const { data, error } = await supabase.rpc('create_product_with_setup', {
    p_vendor_id: vendorId,
    p_input: input,
  })

  if (error?.code === '22023') throw appError(error.message)
  if (error) throw error

  const product = (await listProducts(vendorId)).find((item) => item.id === data.productId)
  if (!product) throw appError('Menu item was created but could not be loaded.', 500)
  return product
}

export async function updateProduct(productId, vendorId, input) {
  const { data, error } = await supabase
    .from('products')
    .update(updateProductPayload(input))
    .eq('id', productId)
    .eq('vendor_id', vendorId)
    .select()
    .single()

  if (error?.code === 'PGRST116') throw appError('Product not found.', 404)
  if (error) throw error
  return data
}

export async function deleteProduct(productId, vendorId) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('vendor_id', vendorId)
    .select('id')
    .single()

  if (error?.code === 'PGRST116') throw appError('Product not found.', 404)
  if (error) throw error
  return data
}
