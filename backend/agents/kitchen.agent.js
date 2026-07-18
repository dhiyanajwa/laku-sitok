import { updateOrderStatus } from '../services/order.service.js'
import { recordAgentActivity } from './activity.agent.js'

export async function updateKitchenOrderStatus(orderId, vendorId, status) {
  const order = await updateOrderStatus(orderId, vendorId, status)
  recordAgentActivity(vendorId, { agent: 'Kitchen Agent', title: 'Kitchen status updated', detail: `${order.order_number} is now ${order.status}.` })

  if (order.status === 'completed') {
    const changes = []
    if (order.readyItemRowsUpdated) changes.push(`${order.readyItemRowsUpdated} ready-item stock row(s)`)
    if (order.ingredientRowsUpdated) changes.push(`${order.ingredientRowsUpdated} ingredient row(s)`)
    recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Completion stock deducted', detail: changes.length ? `${changes.join(' and ')} changed atomically.` : 'No tracked stock rows were affected.' })
    recordAgentActivity(vendorId, { agent: 'Business Intelligence Agent', title: 'Metrics ready', detail: `${order.order_number} now contributes to completed-order analytics.` })
  }

  return order
}