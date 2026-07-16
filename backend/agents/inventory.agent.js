import { updateInventory } from '../services/inventory.service.js'
import { recordAgentActivity } from './activity.agent.js'

export async function adjustInventory(productId, vendorId, input) {
  const inventory = await updateInventory(productId, vendorId, input)
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Inventory adjusted', detail: `Stock is now ${inventory.quantity}; reorder level is ${inventory.reorder_level}.` })
  return inventory
}
