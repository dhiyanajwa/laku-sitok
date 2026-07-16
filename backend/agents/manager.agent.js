import { answerBusinessQuestion } from './business-advisor.agent.js'
import { getBusinessOverview } from './business-intelligence.agent.js'
import { adjustInventory } from './inventory.agent.js'
import { updateKitchenOrderStatus } from './kitchen.agent.js'
import { createCustomerOrder } from './order.agent.js'
import { recordAgentActivity } from './activity.agent.js'

export function placeOrder(vendorId, input) {
  return createCustomerOrder(vendorId, input)
}

export function updateInventoryLevel(productId, vendorId, input) {
  return adjustInventory(productId, vendorId, input)
}

export function updateKitchenStatus(orderId, vendorId, status) {
  return updateKitchenOrderStatus(orderId, vendorId, status)
}

export function getAnalytics(vendorId) {
  return getBusinessOverview(vendorId)
}

export async function askBusinessAdvisor(vendorId, input) {
  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Advisor workflow started', detail: 'The manager delegated the question to business, inventory, and advisor specialists.' })
  return answerBusinessQuestion(vendorId, input)
}
