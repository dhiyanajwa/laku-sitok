import supabase from '../config/supabase.js'
import { appError } from '../utils/app-error.js'
import { getProductAvailability, listProductAvailability } from './availability.service.js'

function ingredientPayload(input, partial = false) {
  const payload = {}
  if (!partial || input.name !== undefined) {
    const name = input.name?.trim()
    if (!name) throw appError('Ingredient name is required.')
    payload.name = name.slice(0, 100)
  }
  if (!partial || input.quantity !== undefined) {
    const quantity = Number(input.quantity)
    if (!Number.isFinite(quantity) || quantity < 0) throw appError('Ingredient quantity must be zero or greater.')
    payload.quantity = quantity
  }
  if (!partial || input.unit !== undefined) {
    const unit = input.unit?.trim()
    if (!unit) throw appError('Ingredient unit is required.')
    payload.unit = unit.slice(0, 30)
  }
  if (!partial || input.reorderLevel !== undefined) {
    const reorderLevel = Number(input.reorderLevel)
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) throw appError('Ingredient reorder level must be zero or greater.')
    payload.reorder_level = reorderLevel
  }
  if (!Object.keys(payload).length) throw appError('Provide at least one ingredient field.')
  return payload
}

export async function listIngredients(vendorId) {
  const { data, error } = await supabase.from('ingredients').select('id, name, quantity, unit, reorder_level, updated_at').eq('vendor_id', vendorId).order('name')
  if (error) throw error
  return (data || []).map((ingredient) => ({ ...ingredient, isLowStock: Number(ingredient.quantity) <= Number(ingredient.reorder_level) }))
}

export async function createIngredient(vendorId, input) {
  const { data, error } = await supabase.from('ingredients').insert({ vendor_id: vendorId, ...ingredientPayload(input) }).select('id, name, quantity, unit, reorder_level, updated_at').single()
  if (error) throw error
  return data
}

export async function updateIngredient(ingredientId, vendorId, input) {
  const updates = ingredientPayload(input, true)
  const { data: current, error: currentError } = await supabase.from('ingredients').select('id, quantity').eq('id', ingredientId).eq('vendor_id', vendorId).single()
  if (currentError?.code === 'PGRST116') throw appError('Ingredient not found.', 404)
  if (currentError) throw currentError

  const { data, error } = await supabase.from('ingredients').update(updates).eq('id', ingredientId).eq('vendor_id', vendorId).select('id, name, quantity, unit, reorder_level, updated_at').single()
  if (error) throw error

  if (updates.quantity !== undefined) {
    const changeQuantity = Number(updates.quantity) - Number(current.quantity)
    if (changeQuantity !== 0) {
      const { error: movementError } = await supabase.from('ingredient_stock_movements').insert({ vendor_id: vendorId, ingredient_id: ingredientId, change_quantity: changeQuantity, reason: 'manual_adjustment' })
      if (movementError) throw movementError
    }
  }
  return data
}

export async function adjustIngredient(ingredientId, vendorId, input) {
  const changeQuantity = Number(input.changeQuantity)
  const reason = input.reason
  if (!Number.isFinite(changeQuantity) || changeQuantity === 0) throw appError('changeQuantity must be a non-zero number.')
  if (!['manual_adjustment', 'restock'].includes(reason)) throw appError('reason must be manual_adjustment or restock.')
  if (reason === 'restock' && changeQuantity < 0) throw appError('A restock amount must be greater than zero.')

  const { data: ingredient, error: readError } = await supabase.from('ingredients').select('id, quantity').eq('id', ingredientId).eq('vendor_id', vendorId).single()
  if (readError?.code === 'PGRST116') throw appError('Ingredient not found.', 404)
  if (readError) throw readError
  const nextQuantity = Number(ingredient.quantity) + changeQuantity
  if (nextQuantity < 0) throw appError('This adjustment would make ingredient stock negative.')

  const { data, error } = await supabase.from('ingredients').update({ quantity: nextQuantity, updated_at: new Date().toISOString() }).eq('id', ingredientId).eq('vendor_id', vendorId).select('id, name, quantity, unit, reorder_level, updated_at').single()
  if (error) throw error
  const { error: movementError } = await supabase.from('ingredient_stock_movements').insert({ vendor_id: vendorId, ingredient_id: ingredientId, change_quantity: changeQuantity, reason })
  if (movementError) throw movementError
  return data
}

export async function getRecipe(vendorId, productId) {
  const { data: product, error: productError } = await supabase.from('products').select('id, name, stock_mode').eq('id', productId).eq('vendor_id', vendorId).single()
  if (productError?.code === 'PGRST116') throw appError('Product not found.', 404)
  if (productError) throw productError
  const { data, error } = await supabase.from('product_recipe_ingredients').select('id, ingredient_id, quantity_per_serving, ingredients(id, name, quantity, unit)').eq('product_id', productId)
  if (error) throw error
  return { product: { id: product.id, name: product.name, stockMode: product.stock_mode }, items: (data || []).map((item) => ({ id: item.id, ingredientId: item.ingredient_id, quantityPerServing: Number(item.quantity_per_serving), ingredient: item.ingredients })) }
}

export async function replaceRecipe(vendorId, productId, input) {
  const { data, error } = await supabase.rpc('replace_product_recipe_with_setup', {
    p_vendor_id: vendorId,
    p_product_id: productId,
    p_items: input.items,
  })

  if (error?.code === '22023') throw appError(error.message)
  if (error?.code === 'P0001') throw appError(error.message, 404)
  if (error) throw error

  return {
    recipe: await getRecipe(vendorId, data.productId),
    availability: await getProductAvailability(vendorId, data.productId),
  }
}
export { listProductAvailability, getProductAvailability }