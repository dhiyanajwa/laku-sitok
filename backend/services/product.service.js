import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

function createProductPayload(input) {
  const name = input.name?.trim()
  const category = input.category?.trim()
  const price = Number(input.price)
  const costPrice = Number(input.costPrice)

  if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isFinite(costPrice) || costPrice < 0) {
    throw appError('name, category, price, and costPrice are required. Prices must be zero or greater.')
  }

  return {
    name,
    category,
    description: input.description?.trim() || null,
    price,
    cost_price: costPrice,
    ...(typeof input.isAvailable === 'boolean' ? { is_available: input.isAvailable } : {}),
  }
}

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

  if (Object.keys(updates).length === 0) throw appError('Provide at least one product field to update.')
  return updates
}

export async function listProducts(vendorId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, category, price, cost_price, is_available, inventory(quantity, reorder_level, updated_at)')
    .eq('vendor_id', vendorId)
    .order('category')
    .order('name')

  if (error) throw error
  return data
}

export async function createProduct(vendorId, input) {
  const product = createProductPayload(input)
  const quantity = Number(input.quantity ?? 0)
  const reorderLevel = Number(input.reorderLevel ?? 5)

  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
    throw appError('quantity and reorderLevel must be whole numbers zero or greater.')
  }

  const { data: createdProduct, error: productError } = await supabase
    .from('products')
    .insert({ ...product, vendor_id: vendorId })
    .select()
    .single()

  if (productError) throw productError

  const { error: inventoryError } = await supabase
    .from('inventory')
    .insert({ product_id: createdProduct.id, quantity, reorder_level: reorderLevel })

  if (inventoryError) {
    await supabase.from('products').delete().eq('id', createdProduct.id)
    throw inventoryError
  }

  return createdProduct
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
