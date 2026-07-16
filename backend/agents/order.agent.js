import { createOrder } from '../services/order.service.js'
import { recordAgentActivity } from './activity.agent.js'

export async function createCustomerOrder(vendorId, input) {
  const order = await createOrder(vendorId, input)
  recordAgentActivity(vendorId, { agent: 'Order Agent', title: 'Order created', detail: `${order.orderNumber} was validated and saved (RM ${Number(order.totalAmount).toFixed(2)} when completed).` })
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Stock updated', detail: 'Stock was reduced atomically with the order.' })
  recordAgentActivity(vendorId, { agent: 'Kitchen Agent', title: 'Order queued', detail: `${order.orderNumber} is ready for the kitchen as Pending.` })
  return order
}
