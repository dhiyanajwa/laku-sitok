import { listOrders } from '../services/order.service.js'
import { placeOrder, updateKitchenStatus } from '../agents/manager.agent.js'
import { getVendorId } from '../services/vendor.service.js'

export async function getOrders(request, response) {
  response.json({ data: await listOrders(request.vendorId, request.query.status) })
}

export async function postOrder(request, response) {
  const vendorId = await getVendorId(request.body.vendorId)
  response.status(201).json({ data: await placeOrder(vendorId, request.body) })
}

export async function patchOrderStatus(request, response) {
  response.json({ data: await updateKitchenStatus(request.params.id, request.vendorId, request.body.status) })
}

