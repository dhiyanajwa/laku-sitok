import supabase from '../config/supabase.js'

function number(value) { return Number(value || 0) }

export function calculateProductAvailability(product) {
  const stockMode = product.stock_mode || 'ready_item'
  const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory

  if (stockMode === 'ready_item') {
    return {
      productId: product.id,
      productName: product.name,
      stockMode,
      estimatedAvailable: number(inventory?.quantity),
      availableQuantity: number(inventory?.quantity),
      availabilitySource: 'item_inventory',
      limitingIngredients: [],
      recipeComplete: true,
      lastUpdated: inventory?.updated_at || product.updated_at || null,
    }
  }

  const recipes = product.product_recipe_ingredients || []
  const validRecipes = recipes.filter((recipe) => recipe.ingredients && Number(recipe.quantity_per_serving) > 0)
  if (!validRecipes.length || validRecipes.length !== recipes.length) {
    return { productId: product.id, productName: product.name, stockMode, estimatedAvailable: null, availableQuantity: null, availabilitySource: 'recipe_setup_incomplete', limitingIngredients: [], recipeComplete: false, lastUpdated: product.updated_at || null }
  }

  const capacities = validRecipes.map((recipe) => ({
    ingredientId: recipe.ingredients.id,
    name: recipe.ingredients.name,
    unit: recipe.ingredients.unit,
    quantity: number(recipe.ingredients.quantity),
    quantityPerServing: number(recipe.quantity_per_serving),
    supportedServings: Math.floor(number(recipe.ingredients.quantity) / number(recipe.quantity_per_serving)),
    updatedAt: recipe.ingredients.updated_at,
  }))
  const estimatedAvailable = Math.min(...capacities.map((item) => item.supportedServings))
  const limitingIngredients = capacities.filter((item) => item.supportedServings === estimatedAvailable)
  const lastUpdated = capacities.map((item) => item.updatedAt).filter(Boolean).sort().at(-1) || null

  return { productId: product.id, productName: product.name, stockMode, estimatedAvailable, availableQuantity: estimatedAvailable, availabilitySource: 'ingredient_recipe', limitingIngredients, recipeComplete: true, lastUpdated }
}

export async function listProductAvailability(vendorId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_mode, updated_at, inventory(quantity, reorder_level, updated_at), product_recipe_ingredients(quantity_per_serving, ingredients(id, name, quantity, unit, reorder_level, updated_at, vendor_id))')
    .eq('vendor_id', vendorId)

  if (error) throw error
  return (data || []).map(calculateProductAvailability)
}

export async function getProductAvailability(vendorId, productId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_mode, updated_at, inventory(quantity, reorder_level, updated_at), product_recipe_ingredients(quantity_per_serving, ingredients(id, name, quantity, unit, reorder_level, updated_at, vendor_id))')
    .eq('vendor_id', vendorId)
    .eq('id', productId)
    .single()
  if (error) throw error
  return calculateProductAvailability(data)
}