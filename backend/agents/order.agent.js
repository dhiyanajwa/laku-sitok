import { createOrder } from '../services/order.service.js'
import { recordAgentActivity } from './activity.agent.js'

export async function createCustomerOrder(vendorId, input) {
  const order = await createOrder(vendorId, input)
  recordAgentActivity(vendorId, { agent: 'Order Agent', title: 'Order created', detail: `${order.orderNumber} was validated and saved as Pending.` })
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Stock check passed', detail: 'Stock remains unchanged until the kitchen completes the order.' })
  recordAgentActivity(vendorId, { agent: 'Kitchen Agent', title: 'Order queued', detail: `${order.orderNumber} is ready for the kitchen as Pending.` })
  return order
}