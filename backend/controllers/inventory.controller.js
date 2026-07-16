import { listInventory } from '../services/inventory.service.js'
import { updateInventoryLevel } from '../agents/manager.agent.js'

export async function getInventory(request, response) {
  response.json({ data: await listInventory(request.vendorId) })
}

export async function patchInventory(request, response) {
  response.json({ data: await updateInventoryLevel(request.params.productId, request.vendorId, request.body) })
}

