import { createAdvisorCompletion } from './openrouter.service.js'
import { appError } from '../utils/app-error.js'

const requestHistory = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 5

function consumeRequest(vendorId) {
  const now = Date.now()
  const recent = (requestHistory.get(vendorId) || []).filter((timestamp) => timestamp > now - WINDOW_MS)
  if (recent.length >= MAX_REQUESTS) throw appError('You have reached the advisor limit of 5 questions per 15 minutes. Please try again later.', 429)
  recent.push(now)
  requestHistory.set(vendorId, recent)
  return MAX_REQUESTS - recent.length
}

function formatCurrency(amount) { return `RM ${Number(amount).toFixed(2)}` }

function buildBusinessSummary(analytics) {
  const products = analytics.productPerformance.length
    ? analytics.productPerformance.map((product) => `${product.name}: ${product.quantity} sold, ${formatCurrency(product.revenue)} revenue, ${formatCurrency(product.profit)} profit`).join('\n')
    : 'No completed product sales yet.'
  const lowStock = analytics.lowStock.length
    ? analytics.lowStock.map((item) => `${item.name}: ${item.quantity} left (reorder level ${item.reorderLevel})`).join('; ')
    : 'No low-stock items.'
  const dailySales = analytics.dailySales.map((day) => `${day.date}: ${formatCurrency(day.revenue)}`).join('; ')

  return `BUSINESS DATA (completed orders only)
Today: ${formatCurrency(analytics.today.revenue)} revenue across ${analytics.today.orderCount} completed orders.
Overall: ${formatCurrency(analytics.overall.revenue)} revenue, ${formatCurrency(analytics.overall.profit)} profit, ${analytics.overall.orderCount} completed orders.
Best seller: ${analytics.bestSeller ? `${analytics.bestSeller.name} (${analytics.bestSeller.quantity} sold)` : 'No completed sales yet.'}
Product performance:
${products}
Last seven days revenue: ${dailySales}
Low stock: ${lowStock}`
}

const systemPrompt = `You are Laku Sitok's practical business advisor for a Malaysian food vendor. Use only the supplied business data. Do not invent sales, profit, stock, customer, or market facts. If data is insufficient, say so. Give a concise answer in plain text with a short summary and 2-3 actionable recommendations. Do not request or reveal personal data.`

export async function askAdvisorWithAnalytics(vendorId, input, analytics) {
  const question = input.question?.trim()
  if (!question) throw appError('Enter a question for the advisor.')
  if (question.length > 280) throw appError('Keep the advisor question to 280 characters or fewer.')

  const remainingRequests = consumeRequest(vendorId)
  const completion = await createAdvisorCompletion({ systemPrompt, userPrompt: `${buildBusinessSummary(analytics)}\n\nVendor question: ${question}` })
  return { ...completion, remainingRequests }
}


