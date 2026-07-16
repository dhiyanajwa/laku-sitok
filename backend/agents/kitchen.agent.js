import { updateOrderStatus } from '../services/order.service.js'
import { recordAgentActivity } from './activity.agent.js'

export async function updateKitchenOrderStatus(orderId, vendorId, status) {
  const order = await updateOrderStatus(orderId, vendorId, status)
  recordAgentActivity(vendorId, { agent: 'Kitchen Agent', title: 'Kitchen status updated', detail: `${order.order_number} is now ${order.status}.` })

  if (order.status === 'completed') {
    recordAgentActivity(vendorId, { agent: 'Business Intelligence Agent', title: 'Metrics ready', detail: `${order.order_number} now contributes to completed-order analytics.` })
  }

  return order
}
