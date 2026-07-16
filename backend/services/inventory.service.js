import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'

export async function listInventory(vendorId) {
  const { data, error } = await supabase
    .from('inventory')
    .select('id, quantity, reorder_level, updated_at, products!inner(id, name, category, is_available, vendor_id)')
    .eq('products.vendor_id', vendorId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return data.map((item) => ({
    ...item,
    isLowStock: item.quantity <= item.reorder_level,
  }))
}

export async function updateInventory(productId, vendorId, input) {
  const updates = {}

  if (input.quantity !== undefined) {
    const quantity = Number(input.quantity)
    if (!Number.isInteger(quantity) || quantity < 0) throw appError('quantity must be a whole number zero or greater.')
    updates.quantity = quantity
  }

  if (input.reorderLevel !== undefined) {
    const reorderLevel = Number(input.reorderLevel)
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) throw appError('reorderLevel must be a whole number zero or greater.')
    updates.reorder_level = reorderLevel
  }

  if (Object.keys(updates).length === 0) throw appError('Provide quantity or reorderLevel.')

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('vendor_id', vendorId)
    .single()

  if (productError || !product) throw appError('Product not found.', 404)

  const { data, error } = await supabase
    .from('inventory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('product_id', productId)
    .select()
    .single()

  if (error) throw error
  return { ...data, isLowStock: data.quantity <= data.reorder_level }
}
