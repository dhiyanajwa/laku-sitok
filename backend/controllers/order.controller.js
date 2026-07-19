import { placeOrder, updateKitchenStatus } from '../agents/manager.agent.js'
import { getPublicOrderTracking, listOrders } from '../services/order.service.js'
import { getVendorId } from '../services/vendor.service.js'

export async function getOrders(request, response) { response.json({ data: await listOrders(request.vendorId, request.query.status) }) }
export async function getOrderTracking(request, response) { response.json({ data: await getPublicOrderTracking(request.params.trackingToken) }) }
// The hackathon customer menu has one public vendor. Do not let an unauthenticated
// caller choose a raw vendor ID and target another vendor's kitchen.
export async function postOrder(request, response) { const vendorId = await getVendorId(); response.status(201).json({ data: await placeOrder(vendorId, request.body) }) }
export async function patchOrderStatus(request, response) { response.json({ data: await updateKitchenStatus(request.params.id, request.vendorId, request.body.status) }) }
