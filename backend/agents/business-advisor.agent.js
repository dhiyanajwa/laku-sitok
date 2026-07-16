import { askAdvisorWithAnalytics } from '../services/advisor.service.js'
import { getBusinessOverview } from './business-intelligence.agent.js'
import { recordAgentActivity } from './activity.agent.js'

export async function answerBusinessQuestion(vendorId, input) {
  const analytics = await getBusinessOverview(vendorId)
  recordAgentActivity(vendorId, { agent: 'Business Intelligence Agent', title: 'Business context prepared', detail: 'Completed sales, profit, and product performance were summarized.' })
  recordAgentActivity(vendorId, { agent: 'Inventory Agent', title: 'Stock context prepared', detail: analytics.lowStock.length ? `${analytics.lowStock.length} low-stock item(s) were included.` : 'No low-stock items were found.' })

  const answer = await askAdvisorWithAnalytics(vendorId, input, analytics)
  recordAgentActivity(vendorId, { agent: 'Business Advisor Agent', title: 'Recommendation generated', detail: 'Grounded advice was generated from the current business context.' })
  return answer
}

