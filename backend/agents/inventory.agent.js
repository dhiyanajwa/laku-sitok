import { adjustIngredient as adjustIngredientStock } from '../services/ingredient.service.js'
import { updateInventory } from '../services/inventory.service.js'
import { recordAgentActivity } from './activity.agent.js'

export async function adjustInventory(productId, vendorId, input) {
  const inventory = await updateInventory(productId, vendorId, input)
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Inventory adjusted', detail: `Stock is now ${inventory.quantity}; reorder level is ${inventory.reorder_level}.` })
  return inventory
}

export async function restockIngredient(ingredientId, vendorId, changeQuantity) {
  const ingredient = await adjustIngredientStock(ingredientId, vendorId, { changeQuantity, reason: 'restock' })
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Ingredient restocked', detail: `${ingredient.name} is now ${ingredient.quantity} ${ingredient.unit}.` })
  return ingredient
}