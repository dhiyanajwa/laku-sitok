import { answerBusinessQuestion } from '../agents/business-advisor.agent.js'
import { recordAgentActivity } from '../agents/activity.agent.js'
import { listIngredients } from './ingredient.service.js'
import { createManagerAction } from './manager-actions.service.js'
import { getAnalyticsOverview } from './analytics.service.js'
import { getAllowedOrderTransitions, listOrders } from './order.service.js'
import { appError } from '../utils/app-error.js'

function number(value) { return Number(value || 0) }

export function getOrderDelayMinutes() {
  const configured = Number(process.env.ORDER_DELAY_MINUTES)
  return Number.isInteger(configured) && configured >= 1 && configured <= 1440 ? configured : 15
}

function formatOrderItems(order) {
  return (order.order_items || []).map((item) => `${item.quantity}× ${item.product_name}`).join(', ')
}

function elapsedMinutes(createdAt) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
}

async function delayedOrders(vendorId) {
  const orders = await listOrders(vendorId)
  const delayMinutes = getOrderDelayMinutes()
  return {
    delayMinutes,
    orders: orders
      .filter((order) => ['pending', 'preparing'].includes(order.status))
      .map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        elapsedMinutes: elapsedMinutes(order.created_at),
        items: formatOrderItems(order),
      }))
      .filter((order) => order.elapsedMinutes >= delayMinutes)
      .sort((left, right) => right.elapsedMinutes - left.elapsedMinutes),
  }
}

function buildAttentionMessage({ delayed, analytics }) {
  const issues = []
  if (delayed.orders.length) issues.push(`${delayed.orders.length} delayed order${delayed.orders.length === 1 ? '' : 's'}`)
  if (analytics.lowStock.length) issues.push(`${analytics.lowStock.length} low ready-item stock alert${analytics.lowStock.length === 1 ? '' : 's'}`)
  if (analytics.ingredientLowStock.length) issues.push(`${analytics.ingredientLowStock.length} low ingredient alert${analytics.ingredientLowStock.length === 1 ? '' : 's'}`)
  const unavailable = analytics.canStillMake.filter((item) => !item.recipeComplete || number(item.estimatedAvailable) === 0)
  if (unavailable.length) issues.push(`${unavailable.length} recipe item${unavailable.length === 1 ? '' : 's'} unavailable to make`)
  return issues.length ? `I found ${issues.join(', ')}.` : 'Everything looks on track right now. No delayed orders or low-stock alerts were found.'
}

export async function getManagerAttentionSummary(vendorId) {
  const [delayed, analytics] = await Promise.all([delayedOrders(vendorId), getAnalyticsOverview(vendorId)])
  const sections = []
  if (delayed.orders.length) sections.push({
    title: `Delayed orders (${delayed.delayMinutes}+ min)`,
    items: delayed.orders.map((order) => ({ title: order.orderNumber, description: `${order.status} for ${order.elapsedMinutes} min — ${order.items || 'No items'}` })),
  })
  if (analytics.lowStock.length) sections.push({
    title: 'Low ready-item stock',
    items: analytics.lowStock.map((item) => ({ title: item.name, description: `${item.quantity} left; reorder at ${item.reorderLevel}` })),
  })
  if (analytics.ingredientLowStock.length) sections.push({
    title: 'Low ingredient stock',
    items: analytics.ingredientLowStock.map((item) => ({ title: item.name, description: `${item.quantity} ${item.unit} left; reorder at ${item.reorderLevel}` })),
  })
  const unavailable = analytics.canStillMake.filter((item) => !item.recipeComplete || number(item.estimatedAvailable) === 0)
  if (unavailable.length) sections.push({
    title: 'Recipe items needing attention',
    items: unavailable.map((item) => ({ title: item.productName || 'Recipe menu item', description: item.recipeComplete ? '0 can still be made.' : 'Recipe setup is incomplete.' })),
  })

  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Attention summary prepared', detail: buildAttentionMessage({ delayed, analytics }) })
  return {
    type: 'information',
    title: 'What needs attention',
    message: buildAttentionMessage({ delayed, analytics }),
    sections,
    delayMinutes: delayed.delayMinutes,
  }
}

async function getDelayedOrdersResponse(vendorId) {
  const delayed = await delayedOrders(vendorId)
  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Delayed orders checked', detail: delayed.orders.length ? `${delayed.orders.length} delayed order(s) found.` : 'No delayed orders found.' })
  return {
    type: 'information',
    title: 'Delayed orders',
    message: delayed.orders.length ? `${delayed.orders.length} order(s) have waited ${delayed.delayMinutes} minutes or longer.` : `No Pending or Preparing orders have waited ${delayed.delayMinutes} minutes or longer.`,
    sections: delayed.orders.length ? [{ title: 'Orders needing attention', items: delayed.orders.map((order) => ({ title: order.orderNumber, description: `${order.status} for ${order.elapsedMinutes} min — ${order.items || 'No items'}` })) }] : [],
    delayMinutes: delayed.delayMinutes,
  }
}

function normaliseIngredientName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')
}

async function prepareRestock(vendorId, message) {
  const match = message.match(/^(?:we\s+)?(?:received|restock(?:ed)?|add)\s+(\d+(?:\.\d+)?)\s+(.+?)[.!?]?$/i)
  if (!match) {
    return { type: 'information', title: 'Restock details needed', message: 'Tell me the positive quantity and exact ingredient name, for example: “We received 20 Burger buns.”', sections: [] }
  }
  const changeQuantity = Number(match[1])
  const requestedName = match[2].trim()
  if (!Number.isFinite(changeQuantity) || changeQuantity <= 0 || requestedName.length > 100) throw appError('Use a positive restock quantity and a valid ingredient name.')

  const ingredients = await listIngredients(vendorId)
  const requestedKey = normaliseIngredientName(requestedName)
  const matches = ingredients.filter((ingredient) => normaliseIngredientName(ingredient.name) === requestedKey)
  if (matches.length !== 1) {
    return {
      type: 'information',
      title: 'Choose the ingredient to restock',
      message: matches.length > 1 ? 'More than one ingredient matched. Please use the full ingredient name.' : `I could not find “${requestedName}”. Use one of the exact ingredient names below or add it in Inventory first.`,
      sections: [{ title: 'Current ingredients', items: ingredients.slice(0, 12).map((ingredient) => ({ title: ingredient.name, description: `${ingredient.quantity} ${ingredient.unit} available` })) }],
    }
  }

  const ingredient = matches[0]
  const action = await createManagerAction(vendorId, {
    originalRequest: message,
    actionType: 'ingredient_restock',
    payload: { ingredientId: ingredient.id, ingredientName: ingredient.name, unit: ingredient.unit, changeQuantity },
  })
  return {
    type: 'proposed_action',
    title: 'Confirm ingredient restock',
    message: `Add ${changeQuantity} ${ingredient.unit} to ${ingredient.name}?`,
    action: { ...action, summary: `Add ${changeQuantity} ${ingredient.unit} to ${ingredient.name}?`, preview: { currentQuantity: number(ingredient.quantity), changeQuantity, nextQuantity: number(ingredient.quantity) + changeQuantity, unit: ingredient.unit } },
    sections: [],
  }
}

async function prepareKitchenStatus(vendorId, message) {
  const orderMatch = message.match(/\bLS-[A-Z0-9-]+\b/i)
  const statusMatch = message.match(/\b(preparing|ready|completed|cancelled)\b/i)
  if (!orderMatch || !statusMatch) {
    return { type: 'information', title: 'Order update details needed', message: 'Use an order number and status, for example: “Order LS-1042 is ready.”', sections: [] }
  }
  const requestedStatus = statusMatch[1].toLowerCase()
  const orders = await listOrders(vendorId)
  const order = orders.find((item) => item.order_number.toLowerCase() === orderMatch[0].toLowerCase())
  if (!order) return { type: 'information', title: 'Order not found', message: `I could not find ${orderMatch[0]} in this store.`, sections: [] }
  if (!getAllowedOrderTransitions(order.status).includes(requestedStatus)) {
    const options = getAllowedOrderTransitions(order.status)
    return { type: 'information', title: 'That order cannot move there yet', message: `${order.order_number} is currently ${order.status}. ${options.length ? `It can move to ${options.join(' or ')}.` : 'It is already final.'}`, sections: [] }
  }

  const action = await createManagerAction(vendorId, {
    originalRequest: message,
    actionType: 'order_status',
    payload: { orderId: order.id, orderNumber: order.order_number, fromStatus: order.status, status: requestedStatus },
  })
  return {
    type: 'proposed_action',
    title: 'Confirm kitchen update',
    message: `Mark ${order.order_number} as ${requestedStatus}?`,
    action: { ...action, summary: `Mark ${order.order_number} as ${requestedStatus}?`, preview: { orderNumber: order.order_number, fromStatus: order.status, toStatus: requestedStatus } },
    sections: [],
  }
}

async function getDailyRecommendation(vendorId, message) {
  const analytics = await getAnalyticsOverview(vendorId)
  const sources = [
    { title: 'Completed today', description: `${analytics.today.orderCount} order(s), RM ${number(analytics.today.revenue).toFixed(2)} revenue` },
    { title: 'Best seller', description: analytics.bestSeller ? `${analytics.bestSeller.name} (${analytics.bestSeller.quantity} sold)` : 'No completed sales yet' },
  ]
  try {
    const advisor = await answerBusinessQuestion(vendorId, { question: message })
    recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Business recommendation prepared', detail: 'The manager presented a grounded Business Advisor recommendation.' })
    return { type: 'recommendation', title: 'Business review', message: advisor.answer, sections: [{ title: 'Source facts', items: sources }], model: advisor.model, remainingRequests: advisor.remainingRequests }
  } catch (error) {
    return { type: 'information', title: 'Business review', message: 'Here is the current completed-sales summary. The AI recommendation is unavailable right now, but your operational data is still available.', sections: [{ title: 'Source facts', items: sources }], advisorUnavailable: true }
  }
}

function classifyMessage(message) {
  const normalized = message.toLowerCase().trim()
  if (/^(?:we\s+)?(?:received|restock(?:ed)?|add)\b/.test(normalized)) return 'restock_preview'
  if (/\bLS-[A-Z0-9-]+\b/i.test(message) || /\border\b.*\b(preparing|ready|completed|cancelled)\b/i.test(normalized)) return 'kitchen_status_preview'
  if (/delayed|late|longest|waiting/.test(normalized)) return 'delayed_orders'
  if (/attention|need(?:s)?\s+my\s+attention/.test(normalized)) return 'attention_summary'
  if (/how.*(?:did|were|was).*today|today.*(?:sales|revenue|business)|sold.*today|best.*sell|what.*restock|(?:why|how).*?(?:revenue|profit|sales).*?(?:change|today)/.test(normalized)) return 'daily_summary'
  return 'unsupported'
}

export async function requestManager(vendorId, input) {
  const message = input?.message?.trim()
  if (!message) throw appError('Enter a request for the Manager.')
  if (message.length > 280) throw appError('Keep the Manager request to 280 characters or fewer.')

  const intent = classifyMessage(message)
  if (intent === 'attention_summary') return getManagerAttentionSummary(vendorId)
  if (intent === 'delayed_orders') return getDelayedOrdersResponse(vendorId)
  if (intent === 'restock_preview') return prepareRestock(vendorId, message)
  if (intent === 'kitchen_status_preview') return prepareKitchenStatus(vendorId, message)
  if (intent === 'daily_summary') return getDailyRecommendation(vendorId, message)
  return {
    type: 'information',
    title: 'Here is what I can help with',
    message: 'Try one of the suggested prompts. I can check attention items, delayed orders, restock ingredients, prepare a kitchen update, or review completed sales.',
    sections: [],
  }
}