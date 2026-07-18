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
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, category, price, cost_price, is_available, stock_mode, inventory(quantity, reorder_level, updated_at)')
    .eq('vendor_id', vendorId)
    .order('category')
    .order('name')

  if (error) throw error
  const availability = await listProductAvailability(vendorId)
  const byProductId = new Map(availability.map((item) => [item.productId, item]))
  return (data || []).map((product) => ({ ...product, ...byProductId.get(product.id) }))
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